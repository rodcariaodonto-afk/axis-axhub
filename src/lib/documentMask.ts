/**
 * Formats a CPF (11 digits) or CNPJ (14 digits) string automatically.
 * CPF:  000.000.000-00
 * CNPJ: 00.000.000/0001-00
 */
export function formatDocument(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);

  if (digits.length <= 11) {
    // CPF mask
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  // CNPJ mask
  return digits
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
