import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { form_response_id } = await req.json();
    if (!form_response_id) throw new Error("form_response_id is required");

    console.log("[process-form-response] Starting for:", form_response_id);

    // 1. Fetch the response + parent form (column is "name", not "title")
    const { data: response, error: respErr } = await supabase
      .from("form_responses")
      .select("*, forms!inner(id, tenant_id, user_id, name, form_config, funil_id)")
      .eq("id", form_response_id)
      .single();

    if (respErr || !response) throw new Error("Response not found: " + respErr?.message);

    // Idempotency: bail out if this response was already processed.
    if ((response as any).processed_at) {
      console.log("[process-form-response] Already processed, skipping:", form_response_id);
      return new Response(JSON.stringify({ ok: true, skipped: "already_processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atomically claim the response. If the update affects 0 rows, another worker won the race.
    const { data: claimed, error: claimErr } = await supabase
      .from("form_responses")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", form_response_id)
      .is("processed_at", null)
      .select("id")
      .maybeSingle();
    if (claimErr || !claimed) {
      console.log("[process-form-response] Could not claim (already processed):", form_response_id);
      return new Response(JSON.stringify({ ok: true, skipped: "already_processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenant_id = response.forms.tenant_id;
    const form_owner_id = response.forms.user_id;
    const rd = response.response_data as Record<string, any>;
    const formConfig = (response.forms.form_config || []) as Array<{ id: string; label: string; type?: string }>;

    // Build a map from question ID to label for searching
    const idToLabel: Record<string, string> = {};
    for (const q of formConfig) {
      if (q.id && q.label) {
        idToLabel[q.id] = q.label;
      }
    }

    // Build a label-based lookup: merge question labels with their answer values
    const labelValueMap: Record<string, any> = {};
    for (const [key, value] of Object.entries(rd)) {
      const label = idToLabel[key] || key;
      labelValueMap[label.toLowerCase()] = value;
    }

    console.log("[process-form-response] Label-value map keys:", Object.keys(labelValueMap));

    // 2. Extract fields by searching labels
    const findValue = (keywords: string[]): string => {
      for (const [label, val] of Object.entries(labelValueMap)) {
        if (keywords.some((kw) => label.includes(kw.toLowerCase()))) {
          return Array.isArray(val) ? val.join(", ") : String(val || "");
        }
      }
      return "";
    };

    // Use stored respondent info as primary source, form answers as enrichment
    const respondent_name = response.respondent_name || findValue(["seu nome", "your name", "nome completo"]) || "Sem nome";
    const email = response.respondent_email || findValue(["e-mail", "email", "melhor email"]) || "";
    const phone = findValue(["telefone", "phone", "whatsapp"]);
    const institution = findValue(["instituição", "institution", "escola", "school", "nome completo de sua instituição"]) || "Instituição desconhecida";
    const country = findValue(["país", "country", "pais"]);
    const role = findValue(["cargo", "role", "função", "funcao"]);
    const totalStudentsStr = findValue(["total de alunos", "total students", "quantas crianças", "quantos alunos"]);
    const specialNeedsStr = findValue(["necessidades especiais", "special needs", "alunos com deficiência", "quantos alunos aproximadamente"]);
    const specialNeedsTypes = findValue(["tipos de necessidades", "types of needs", "deficiências atendidas", "quais são os tipos"]);
    const hasInclusionStr = findValue(["programa de inclusão", "inclusion program"]);
    const investmentCapacity = findValue(["capacidade de investimento", "investment capacity", "investimento", "investir em novas soluções"]);

    const totalStudents = parseInt(totalStudentsStr) || 0;
    const studentsWithNeeds = parseInt(specialNeedsStr) || 0;
    const hasInclusion = ["sim", "yes", "true"].includes(hasInclusionStr.toLowerCase());
    const needsArray = specialNeedsTypes ? specialNeedsTypes.split(",").map((s: string) => s.trim()).filter(Boolean) : [];

    // Estimated value based on investment capacity
    let estimatedValue = 1000;
    const invLower = investmentCapacity.toLowerCase();
    if (invLower.includes("significativ") || invLower.includes("acima de r$ 5.000")) estimatedValue = 5000;
    else if (invLower.includes("moderad") || invLower.includes("r$ 3.000") || invLower.includes("r$ 1.000")) estimatedValue = 3000;
    else if (invLower.includes("r$ 500")) estimatedValue = 1500;

    console.log("[process-form-response] Extracted:", { respondent_name, email, institution, investmentCapacity, estimatedValue });

    // 3. Upsert Lead
    let lead_id: string | null = null;
    if (email) {
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("tenant_id", tenant_id)
        .eq("email", email)
        .maybeSingle();

      if (existingLead) {
        lead_id = existingLead.id;
        await supabase
          .from("leads")
          .update({
            name: respondent_name,
            phone: phone || undefined,
            source: "formulario",
            score: 60,
          })
          .eq("id", lead_id);
        console.log("[process-form-response] Lead updated:", lead_id);
      } else {
        const { data: newLead, error: leadErr } = await supabase
          .from("leads")
          .insert({
            tenant_id,
            name: respondent_name,
            email,
            phone: phone || null,
            source: "formulario",
            status: "new",
            score: 60,
          })
          .select("id")
          .single();
        if (leadErr) console.error("[process-form-response] Lead insert error:", leadErr.message);
        else lead_id = newLead.id;
        console.log("[process-form-response] Lead created:", lead_id);
      }
    } else {
      // No email - still create lead with name
      const { data: newLead, error: leadErr } = await supabase
        .from("leads")
        .insert({
          tenant_id,
          name: respondent_name,
          phone: phone || null,
          source: "formulario",
          status: "new",
          score: 40,
        })
        .select("id")
        .single();
      if (leadErr) console.error("[process-form-response] Lead insert error:", leadErr.message);
      else lead_id = newLead?.id;
      console.log("[process-form-response] Lead created (no email):", lead_id);
    }

    // 4. Create Account
    let account_id: string | null = null;
    try {
      const { data: acc, error: accErr } = await supabase
        .from("crm_accounts")
        .insert({
          tenant_id,
          name: institution,
          email: email || null,
          phone: phone || null,
          segment: "Educação",
        })
        .select("id")
        .single();
      if (accErr) throw accErr;
      account_id = acc.id;
      console.log("[process-form-response] Account created:", account_id);
    } catch (e) {
      console.error("[process-form-response] Account error:", e.message);
    }

    // 5. Create Contact linked to Account
    let contact_id: string | null = null;
    try {
      const nameParts = respondent_name.split(" ");
      const { data: ct, error: ctErr } = await supabase
        .from("contacts")
        .insert({
          tenant_id,
          first_name: nameParts[0] || respondent_name,
          last_name: nameParts.slice(1).join(" ") || null,
          email: email || null,
          phone: phone || null,
          position: role || null,
          account_id: account_id,
          is_primary: true,
        })
        .select("id")
        .single();
      if (ctErr) throw ctErr;
      contact_id = ct.id;
      console.log("[process-form-response] Contact created:", contact_id);
    } catch (e) {
      console.error("[process-form-response] Contact error:", e.message);
    }

    // 6. Create Opportunity
    let opportunity_id: string | null = null;
    try {
      const { data: stages } = await supabase
        .from("opportunity_stages")
        .select("name")
        .eq("tenant_id", tenant_id)
        .order("order_index", { ascending: true })
        .limit(1);

      const stageName = stages?.[0]?.name || "Prospecting";

      const { data: opp, error: oppErr } = await supabase
        .from("opportunities")
        .insert({
          tenant_id,
          name: `Oportunidade - ${institution}`,
          amount: estimatedValue,
          probability: 0.3,
          stage: stageName,
          account_id: account_id,
          contact_id: contact_id,
          owner_id: form_owner_id,
          description: `Gerado automaticamente do formulário. Capacidade de investimento: ${investmentCapacity || "Não informado"}`,
        })
        .select("id")
        .single();
      if (oppErr) throw oppErr;
      opportunity_id = opp.id;
      console.log("[process-form-response] Opportunity created:", opportunity_id);
    } catch (e) {
      console.error("[process-form-response] Opportunity error:", e.message);
    }

    // 7. Create Activity (follow-up in 3 days)
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);

      await supabase.from("activities").insert({
        tenant_id,
        title: `Follow-up: ${respondent_name} - ${institution}`,
        description: `Entrar em contato com ${respondent_name} (${email}) da ${institution}. Capacidade de investimento: ${investmentCapacity || "Não informado"}.`,
        type: "task",
        priority: "high",
        status: "open",
        due_at: dueDate.toISOString(),
        lead_id,
        owner_user_id: form_owner_id,
      });
      console.log("[process-form-response] Activity created");
    } catch (e) {
      console.error("[process-form-response] Activity error:", e.message);
    }

    // 8. Insert bi_form_data
    try {
      await supabase.from("bi_form_data").insert({
        tenant_id,
        form_response_id,
        form_id: response.forms.id,
        lead_id,
        account_id,
        opportunity_id,
        institution_name: institution,
        country: country || null,
        respondent_name,
        respondent_email: email || null,
        respondent_role: role || null,
        total_students: totalStudents,
        students_with_special_needs: studentsWithNeeds,
        special_needs_types: needsArray.length ? needsArray : null,
        has_inclusion_program: hasInclusion,
        investment_capacity: investmentCapacity || null,
        estimated_value: estimatedValue,
        additional_data: rd,
      });
      console.log("[process-form-response] BI data inserted");
    } catch (e) {
      console.error("[process-form-response] BI data error:", e.message);
    }

    // 9. Create notification for form owner
    try {
      await supabase.from("notifications").insert({
        tenant_id,
        recipient_id: form_owner_id,
        notification_type_id: "form_response",
        title: `Nova resposta: ${response.forms.name}`,
        message: `${respondent_name} (${institution}) respondeu ao formulário. Valor estimado: R$ ${estimatedValue.toLocaleString("pt-BR")}`,
        priority: "high",
        related_entity_type: "form_response",
        related_entity_id: form_response_id,
      });
      console.log("[process-form-response] Notification sent");
    } catch (e) {
      console.error("[process-form-response] Notification error:", e.message);
    }

    // 10. Send confirmation email to respondent via Resend
    if (email) {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey) {
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
                <tr><td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
                    <tr><td style="background:#1a1a2e;padding:24px;text-align:center;">
                      <h1 style="color:#ffffff;margin:0;font-size:22px;">Axis CRM</h1>
                    </td></tr>
                    <tr><td style="padding:32px 24px;">
                      <p style="font-size:16px;color:#333;">Olá <strong>${respondent_name}</strong>,</p>
                      <p style="font-size:15px;color:#555;line-height:1.6;">
                        Seu formulário foi entregue e em breve entraremos em contato.
                      </p>
                      <p style="font-size:14px;color:#888;margin-top:24px;">Obrigado por nos enviar suas informações!</p>
                    </td></tr>
                    <tr><td style="background:#f9fafb;padding:16px 24px;text-align:center;">
                      <p style="font-size:12px;color:#aaa;margin:0;">© Axis CRM — axhub.com.br</p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
          `;

          const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Axis CRM <noreply@axhub.com.br>",
              to: [email],
              subject: "Confirmação - Recebemos seu formulário",
              html: emailHtml,
            }),
          });

          if (!resendRes.ok) {
            const errBody = await resendRes.text();
            console.error("[process-form-response] Resend error:", errBody);
          } else {
            console.log("[process-form-response] Confirmation email sent to:", email);
          }
        } else {
          console.warn("[process-form-response] RESEND_API_KEY not configured, skipping email");
        }
      } catch (e) {
        console.error("[process-form-response] Email send error:", e.message);
      }
    }

    // 11. Start linked funnel if form has funil_id
    try {
      const formData = response.forms as any;
      if (formData.funil_id) {
        const phone = findValue(["telefone", "phone", "whatsapp"]);
        if (phone) {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const funnelRes = await fetch(`${supabaseUrl}/functions/v1/start-funnel-execution`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              funil_id: formData.funil_id,
              contato_telefone: phone,
              contato_nome: respondent_name,
              tenant_id,
            }),
          });
          const funnelResult = await funnelRes.json();
          console.log("[process-form-response] Funnel started:", funnelResult);
        } else {
          console.warn("[process-form-response] Form has funil_id but no phone found, skipping funnel start");
        }
      }
    } catch (e) {
      console.error("[process-form-response] Funnel start error:", e.message);
    }

    // 12. Dispatch workflows triggered by form.submitted
    try {
      const { data: workflows } = await supabase
        .from("workflows")
        .select("id")
        .eq("tenant_id", tenant_id)
        .eq("is_active", true)
        .contains("trigger_types", ["form.submitted"]);

      if (workflows && workflows.length > 0) {
        const triggerData = {
          form_response_id,
          form_id: response.forms.id,
          form_title: response.forms.name,
          respondent_name,
          respondent_email: email,
          respondent_phone: phone,
          institution_name: institution,
          country,
          respondent_role: role,
          total_students: totalStudents,
          students_with_special_needs: studentsWithNeeds,
          has_inclusion_program: hasInclusion,
          investment_capacity: investmentCapacity,
          estimated_value: estimatedValue,
          lead_id,
          account_id,
          contact_id,
          opportunity_id,
        };

        for (const wf of workflows) {
          try {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            await fetch(`${supabaseUrl}/functions/v1/workflow-runner`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${serviceKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                workflow_id: wf.id,
                trigger_data: triggerData,
                trigger_type: "form.submitted",
              }),
            });
            console.log("[process-form-response] Workflow dispatched:", wf.id);
          } catch (wfErr) {
            console.error("[process-form-response] Workflow dispatch error:", wfErr.message);
          }
        }
      }
    } catch (e) {
      console.error("[process-form-response] Workflow query error:", e.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        lead_id,
        account_id,
        contact_id,
        opportunity_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[process-form-response] Fatal error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
