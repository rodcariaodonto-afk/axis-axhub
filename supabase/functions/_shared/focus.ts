// Helpers Focus NFe API v2
// Doc: https://focusnfe.com.br/doc/

export type FocusEnvironment = "homologacao" | "producao";

export const FOCUS_BASE_URLS: Record<FocusEnvironment, string> = {
  homologacao: "https://homologacao.focusnfe.com.br",
  producao: "https://api.focusnfe.com.br",
};

export function buildFocusAuthHeader(token: string): string {
  // HTTP Basic Auth: token como user, senha vazia
  const credentials = btoa(`${token}:`);
  return `Basic ${credentials}`;
}

export function buildFocusUrl(
  environment: FocusEnvironment,
  path: string,
): string {
  return `${FOCUS_BASE_URLS[environment]}${path}`;
}

// MOCK MODE: enquanto a empresa real não está cadastrada na Focus
// Mude para `false` quando token de homologação real estiver configurado
export const MOCK_MODE = true;

export const MOCK_RESPONSES = {
  nfe_aceita: {
    status: "processando_autorizacao",
    cnpj_emitente: "00000000000000",
    ref: "MOCK_REF",
  },
  nfe_autorizada: {
    cnpj_emitente: "00000000000000",
    ref: "MOCK_REF",
    status: "autorizado",
    status_sefaz: "100",
    mensagem_sefaz: "Autorizado o uso da NF-e (MOCK)",
    chave_nfe: "NFe35260400000000000000550010000000011000000019",
    numero: "1",
    serie: "1",
    caminho_xml_nota_fiscal: "/mock/xml/nfe-mock.xml",
    caminho_danfe: "/mock/danfe/nfe-mock.pdf",
  },
  nfse_aceita: {
    status: "processando_autorizacao",
    cnpj_emitente: "00000000000000",
    ref: "MOCK_REF",
  },
  nfse_autorizada: {
    cnpj_emitente: "00000000000000",
    ref: "MOCK_REF",
    status: "autorizado",
    status_sefaz: "100",
    mensagem_sefaz: "Autorizado o uso da NFS-e (MOCK)",
    numero_rps: "1",
    serie_rps: "1",
    numero: "1",
    codigo_verificacao: "ABC123",
    caminho_xml_nota_fiscal: "/mock/xml/nfse-mock.xml",
    caminho_pdf_nota_fiscal: "/mock/pdf/nfse-mock.pdf",
  },
};
