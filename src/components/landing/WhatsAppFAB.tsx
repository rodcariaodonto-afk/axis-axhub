import { MessageCircle } from "lucide-react";

const WHATSAPP_URL = "https://wa.me/5500000000000?text=Olá%2C%20gostaria%20de%20falar%20com%20o%20suporte%20AXIS";

export default function WhatsAppFAB() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      title="Falar com Suporte"
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xl hover:bg-[#1fbb59] hover:scale-105 transition-all"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
