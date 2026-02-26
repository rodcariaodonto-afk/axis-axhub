
export interface MacroCategory {
  label: string;
  macros: { key: string; label: string }[];
}

export const macroCategories: MacroCategory[] = [
  {
    label: "Conta",
    macros: [
      { key: "account_name", label: "Nome da Conta" },
      { key: "account_cnpj", label: "CNPJ" },
      { key: "account_phone", label: "Telefone" },
      { key: "account_email", label: "E-mail" },
      { key: "account_segment", label: "Segmento" },
      { key: "account_website", label: "Website" },
    ],
  },
  {
    label: "Contato",
    macros: [
      { key: "contact_name", label: "Nome do Contato" },
      { key: "contact_email", label: "E-mail do Contato" },
      { key: "contact_phone", label: "Telefone do Contato" },
      { key: "contact_position", label: "Cargo" },
    ],
  },
  {
    label: "Deal",
    macros: [
      { key: "deal_name", label: "Nome do Deal" },
      { key: "deal_value", label: "Valor do Deal" },
      { key: "deal_status", label: "Status do Deal" },
    ],
  },
  {
    label: "Contrato",
    macros: [
      { key: "contract_title", label: "Título do Contrato" },
      { key: "contract_type", label: "Tipo do Contrato" },
      { key: "contract_value", label: "Valor do Contrato" },
      { key: "contract_currency", label: "Moeda" },
      { key: "contract_start_date", label: "Data Início" },
      { key: "contract_end_date", label: "Data Término" },
      { key: "contract_renewal_date", label: "Data Renovação" },
    ],
  },
  {
    label: "Data / Usuário",
    macros: [
      { key: "current_date", label: "Data Atual (curta)" },
      { key: "current_date_full", label: "Data Atual (extenso)" },
      { key: "user_name", label: "Nome do Usuário" },
      { key: "user_email", label: "E-mail do Usuário" },
    ],
  },
];

const monthNames = [
  "janeiro","fevereiro","março","abril","maio","junho",
  "julho","agosto","setembro","outubro","novembro","dezembro",
];

export function replaceMacros(
  template: string,
  data: {
    account?: any;
    contact?: any;
    deal?: any;
    contract?: any;
    user?: { full_name?: string; email?: string };
  }
): string {
  const now = new Date();
  const map: Record<string, string> = {
    // Account
    account_name: data.account?.name || "",
    account_cnpj: data.account?.cnpj || "",
    account_phone: data.account?.phone || "",
    account_email: data.account?.email || "",
    account_segment: data.account?.segment || "",
    account_website: data.account?.website || "",
    // Contact
    contact_name: data.contact
      ? [data.contact.first_name, data.contact.last_name].filter(Boolean).join(" ")
      : "",
    contact_email: data.contact?.email || "",
    contact_phone: data.contact?.phone || "",
    contact_position: data.contact?.position || "",
    // Deal
    deal_name: data.deal?.name || "",
    deal_value: data.deal?.estimated_value != null
      ? Number(data.deal.estimated_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "",
    deal_status: data.deal?.status || "",
    // Contract
    contract_title: data.contract?.name || "",
    contract_type: data.contract?.contract_type || "",
    contract_value: data.contract?.value != null
      ? Number(data.contract.value).toLocaleString("pt-BR", { style: "currency", currency: data.contract.currency || "BRL" })
      : "",
    contract_currency: data.contract?.currency || "",
    contract_start_date: data.contract?.start_date
      ? new Date(data.contract.start_date).toLocaleDateString("pt-BR")
      : "",
    contract_end_date: data.contract?.end_date
      ? new Date(data.contract.end_date).toLocaleDateString("pt-BR")
      : "",
    contract_renewal_date: data.contract?.renewal_date
      ? new Date(data.contract.renewal_date).toLocaleDateString("pt-BR")
      : "",
    // Date / User
    current_date: now.toLocaleDateString("pt-BR"),
    current_date_full: `${now.getDate()} de ${monthNames[now.getMonth()]} de ${now.getFullYear()}`,
    user_name: data.user?.full_name || "",
    user_email: data.user?.email || "",
  };

  return template.replace(/\{\{(\s*\w+\s*)\}\}/g, (_match, key) => {
    const k = key.trim();
    if (k in map) return map[k];
    // Invalid macro — leave as-is
    return `{{${k}}}`;
  });
}
