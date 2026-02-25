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

    // 1. Fetch the response + parent form
    const { data: response, error: respErr } = await supabase
      .from("form_responses")
      .select("*, forms!inner(id, tenant_id, user_id, title)")
      .eq("id", form_response_id)
      .single();

    if (respErr || !response) throw new Error("Response not found: " + respErr?.message);

    const tenant_id = response.forms.tenant_id;
    const form_owner_id = response.forms.user_id;
    const rd = response.response_data as Record<string, any>;

    // 2. Extract fields from response_data (keys are question labels)
    const findValue = (keywords: string[]): string => {
      for (const key of Object.keys(rd)) {
        const lk = key.toLowerCase();
        if (keywords.some((kw) => lk.includes(kw))) {
          const v = rd[key];
          return Array.isArray(v) ? v.join(", ") : String(v || "");
        }
      }
      return "";
    };

    const respondent_name = findValue(["seu nome", "your name", "nome completo"]) || response.respondent_name || "Sem nome";
    const email = findValue(["e-mail", "email"]) || response.respondent_email || "";
    const phone = findValue(["telefone", "phone", "whatsapp"]);
    const institution = findValue(["instituição", "institution", "escola", "school"]) || "Instituição desconhecida";
    const country = findValue(["país", "country", "pais"]);
    const role = findValue(["cargo", "role", "função", "funcao"]);
    const totalStudentsStr = findValue(["total de alunos", "total students", "quantos alunos"]);
    const specialNeedsStr = findValue(["necessidades especiais", "special needs", "alunos com deficiência"]);
    const specialNeedsTypes = findValue(["tipos de necessidades", "types of needs", "deficiências atendidas"]);
    const hasInclusionStr = findValue(["programa de inclusão", "inclusion program"]);
    const investmentCapacity = findValue(["capacidade de investimento", "investment capacity", "investimento"]);

    const totalStudents = parseInt(totalStudentsStr) || 0;
    const studentsWithNeeds = parseInt(specialNeedsStr) || 0;
    const hasInclusion = ["sim", "yes", "true"].includes(hasInclusionStr.toLowerCase());
    const needsArray = specialNeedsTypes ? specialNeedsTypes.split(",").map((s: string) => s.trim()).filter(Boolean) : [];

    // Estimated value based on investment capacity
    let estimatedValue = 1000;
    const invLower = investmentCapacity.toLowerCase();
    if (invLower.includes("significativ")) estimatedValue = 5000;
    else if (invLower.includes("moderad")) estimatedValue = 3000;

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
      // Get first opportunity stage
      const { data: stages } = await supabase
        .from("opportunity_stages")
        .select("id")
        .eq("tenant_id", tenant_id)
        .order("order_index", { ascending: true })
        .limit(1);

      const stage_id = stages?.[0]?.id || null;

      const { data: opp, error: oppErr } = await supabase
        .from("opportunities")
        .insert({
          tenant_id,
          name: `Oportunidade - ${institution}`,
          amount: estimatedValue,
          probability: 30,
          stage_id,
          source: "formulario",
          account_id: account_id,
          contact_id: contact_id,
          notes: `Gerado automaticamente do formulário. Capacidade de investimento: ${investmentCapacity || "Não informado"}`,
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
        user_id: form_owner_id,
        type: "form_response",
        title: `Nova resposta: ${response.forms.title}`,
        message: `${respondent_name} (${institution}) respondeu ao formulário. Valor estimado: R$ ${estimatedValue.toLocaleString("pt-BR")}`,
        priority: "high",
        data: {
          form_response_id,
          lead_id,
          account_id,
          opportunity_id,
        },
      });
      console.log("[process-form-response] Notification sent");
    } catch (e) {
      console.error("[process-form-response] Notification error:", e.message);
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
