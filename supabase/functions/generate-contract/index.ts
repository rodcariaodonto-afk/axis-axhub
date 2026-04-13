import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    // Parse body
    const { contract_id } = await req.json();
    if (!contract_id || typeof contract_id !== "string") {
      return new Response(JSON.stringify({ error: "contract_id obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Service client for operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user profile for tenant
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .single();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Perfil não encontrado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get contract
    const { data: contract, error: cErr } = await serviceClient
      .from("contracts")
      .select("*, crm_accounts(name, cnpj, email, phone)")
      .eq("id", contract_id)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (cErr || !contract) {
      return new Response(JSON.stringify({ error: "Contrato não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate simple text-based PDF content
    const now = new Date().toISOString();
    const accountName = contract.crm_accounts?.name || "N/A";
    const accountCnpj = contract.crm_accounts?.cnpj || "N/A";

    // Simple PDF generation using basic PDF structure
    const pdfContent = generateSimplePdf({
      title: contract.name,
      accountName,
      accountCnpj,
      value: contract.value,
      currency: contract.currency,
      startDate: contract.start_date,
      endDate: contract.end_date,
      description: contract.description,
      contractType: contract.contract_type,
      generatedAt: now,
    });

    // Upload to storage
    const filePath = `${profile.tenant_id}/${contract_id}/${Date.now()}.pdf`;
    const { error: uploadErr } = await serviceClient.storage
      .from("axis-contracts")
      .upload(filePath, pdfContent, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      return new Response(JSON.stringify({ error: "Falha ao salvar PDF" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update contract document_url
    await serviceClient
      .from("contracts")
      .update({ document_url: filePath, updated_at: now })
      .eq("id", contract_id);

    // Create signed URL (60 min)
    const { data: signedUrl } = await serviceClient.storage
      .from("axis-contracts")
      .createSignedUrl(filePath, 3600);

    return new Response(
      JSON.stringify({ success: true, url: signedUrl?.signedUrl, path: filePath }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-contract error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao gerar contrato" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

interface PdfData {
  title: string;
  accountName: string;
  accountCnpj: string;
  value: number | null;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  contractType: string | null;
  generatedAt: string;
}

function generateSimplePdf(data: PdfData): Uint8Array {
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "N/A";
  const formatValue = (v: number | null, c: string) =>
    v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: c }) : "N/A";

  const lines = [
    `CONTRATO: ${data.title}`,
    ``,
    `Tipo: ${data.contractType || "N/A"}`,
    `Conta: ${data.accountName}`,
    `CNPJ: ${data.accountCnpj}`,
    `Valor: ${formatValue(data.value, data.currency)}`,
    `Moeda: ${data.currency}`,
    `Data de Inicio: ${formatDate(data.startDate)}`,
    `Data de Termino: ${formatDate(data.endDate)}`,
    ``,
    `DESCRICAO:`,
    ...(data.description || "Sem descricao").split("\n"),
    ``,
    `Documento gerado em: ${new Date(data.generatedAt).toLocaleString("pt-BR")}`,
    `Este documento tem validade legal conforme Lei 14.063/2020.`,
  ];

  const textContent = lines.join("\n");
  const encoder = new TextEncoder();

  // Build a minimal valid PDF
  const objects: string[] = [];
  let objCount = 0;

  const addObj = (content: string) => {
    objCount++;
    objects.push(`${objCount} 0 obj\n${content}\nendobj`);
    return objCount;
  };

  // Catalog
  const catalogId = addObj(`<< /Type /Catalog /Pages 2 0 R >>`);
  // Pages
  const pagesId = addObj(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);

  // Escape text for PDF
  const escapePdf = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  // Build content stream
  let contentStream = "BT\n/F1 11 Tf\n";
  let y = 750;
  for (const line of lines) {
    if (y < 50) break;
    contentStream += `1 0 0 1 50 ${y} Tm\n(${escapePdf(line)}) Tj\n`;
    y -= 16;
  }
  contentStream += "ET";

  const streamBytes = encoder.encode(contentStream);
  const streamId = addObj(`<< /Length ${streamBytes.length} >>\nstream\n${contentStream}\nendstream`);

  // Page
  const pageId = addObj(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${streamId} 0 R /Resources << /Font << /F1 5 0 R >> >> >>`
  );

  // Font
  const fontId = addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);

  // Build PDF
  const header = "%PDF-1.4\n";
  const body = objects.join("\n") + "\n";
  const xrefOffset = encoder.encode(header + body).length;

  let xref = `xref\n0 ${objCount + 1}\n0000000000 65535 f \n`;
  let offset = header.length;
  for (const obj of objects) {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
    offset += encoder.encode(obj + "\n").length;
  }

  const trailer = `trailer\n<< /Size ${objCount + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const pdfString = header + body + xref + trailer;
  return encoder.encode(pdfString);
}
