import { Link } from "react-router-dom";
import axisLogo from "@/assets/axis-logo.png";

const NAV = [
  { href: "#solucoes", label: "Soluções" },
  { href: "#beneficios", label: "Benefícios" },
  { href: "#planos", label: "Planos" },
  { href: "#contato", label: "Contato" },
];

const WHATSAPP_URL = "https://wa.me/5500000000000?text=Olá%2C%20gostaria%20de%20falar%20com%20o%20suporte%20AXIS";

export default function LandingHeader() {
  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2" aria-label="AXIS — início">
          <img src={axisLogo} alt="AXIS" className="h-8 w-auto" />
        </a>

        <nav className="hidden md:flex items-center gap-8" aria-label="Navegação principal">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-[#4B5563] hover:text-[#0F172A] transition-colors"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/auth"
            className="hidden sm:inline-flex h-10 items-center px-4 rounded-lg text-sm font-semibold text-[#0F172A] hover:bg-slate-100 transition-colors"
            style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
          >
            Login
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center px-4 sm:px-5 rounded-lg text-sm font-semibold text-white bg-[#25D366] hover:bg-[#1fbb59] transition-colors shadow-sm"
            style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
          >
            Falar com Suporte
          </a>
        </div>
      </div>
    </header>
  );
}
