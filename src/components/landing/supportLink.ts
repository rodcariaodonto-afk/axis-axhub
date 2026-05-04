// Centraliza o link de WhatsApp do suporte AXIS.
// Número: (11) 93917-1383 → formato internacional 5511939171383
const SUPPORT_PHONE = "5511939171383";

export function buildSupportWhatsAppUrl(message?: string): string {
  const text = message?.trim() || "Olá! Gostaria de falar com o suporte AXIS.";
  return `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(text)}`;
}

export const SUPPORT_WHATSAPP_DEFAULT = buildSupportWhatsAppUrl(
  "Olá! Vim pela landing do AXIS e gostaria de falar com o suporte."
);
