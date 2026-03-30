/**
 * Document type: CPF (11 digits), CNPJ (14 digits), or NIF (any other length).
 */
export type DocType = "cpf" | "cnpj" | "nif";

/**
 * Detects the document type based on digit count.
 * 11 digits → CPF, 14 digits → CNPJ, otherwise → NIF.
 */
export function detectDocumentType(value: string): DocType {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length === 11) return "cpf";
  if (digits.length === 14) return "cnpj";
  return "nif";
}

/**
 * Formats a CPF (11 digits) or CNPJ (14 digits) string automatically.
 * NIF values are returned as-is (digits only, no mask).
 * CPF:  000.000.000-00
 * CNPJ: 00.000.000/0001-00
 */
export function formatDocument(value: string, forceType?: DocType): string {
  const digits = value.replace(/\D/g, "");

  if (forceType === "nif") return digits;

  const sliced = digits.slice(0, 14);

  if (sliced.length <= 11) {
    // CPF mask
    return sliced
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  // CNPJ mask
  return sliced
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/**
 * Strips formatting, returning only digits.
 */
export function stripDocument(value: string): string {
  return value.replace(/\D/g, "");
}
