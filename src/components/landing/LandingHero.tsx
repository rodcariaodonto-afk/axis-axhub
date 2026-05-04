import { Check } from "lucide-react";
import DashboardMockup from "./DashboardMockup";

const PROVAS = [
  { titulo: "Implementação", desc: "Setup orientado" },
  { titulo: "Flexibilidade", desc: "Sem fricção operacional" },
  { titulo: "Conversão", desc: "Atendimento consultivo" },
];

export default function LandingHero() {
  return (
    <section id="top" className="relative pt-24 pb-16 sm:pt-28 sm:pb-20 bg-[#EFF6FF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span
            className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-slate-200 px-3 py-1 text-xs font-semibold text-[#0F172A] shadow-sm"
            style={{ fontFamily: "Plus Jakarta Sans" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
            CRM com Governança e IA
          </span>

          <h1
            className="mt-5 text-[40px] sm:text-[48px] lg:text-[54px] leading-[1.05] tracking-tight font-extrabold text-[#0F172A]"
            style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
          >
            O CRM de Governança para empresas que vendem com processo, controlo e{" "}
            <span className="text-[#3B82F6]">Inteligência Artificial</span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-[#4B5563] max-w-xl" style={{ fontFamily: "Inter, sans-serif" }}>
            Pare de perder oportunidades em ferramentas fragmentadas. Centralize CRM, pipeline, atendimento, WhatsApp,
            automações, dashboards e governança comercial em uma única plataforma com IA nativa.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <a
              href="#contato"
              className="inline-flex h-12 items-center justify-center px-6 rounded-lg bg-[#25D366] text-white font-semibold hover:bg-[#1fbb59] shadow-sm transition-colors"
              style={{ fontFamily: "Plus Jakarta Sans" }}
            >
              Falar com Suporte
            </a>
            <a
              href="#solucoes"
              className="inline-flex h-12 items-center justify-center px-6 rounded-lg border-2 border-[#25D366] text-[#0F172A] font-semibold hover:bg-[#25D366]/5 transition-colors"
              style={{ fontFamily: "Plus Jakarta Sans" }}
            >
              Conhecer Soluções
            </a>
          </div>

          <ul className="mt-8 grid sm:grid-cols-3 gap-4">
            {PROVAS.map((p) => (
              <li key={p.titulo} className="flex items-start gap-2">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-[#25D366]/15 flex items-center justify-center">
                  <Check className="h-3 w-3 text-[#25D366]" strokeWidth={3} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]" style={{ fontFamily: "Plus Jakarta Sans" }}>
                    {p.titulo}
                  </p>
                  <p className="text-xs text-[#4B5563]">{p.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:pl-8">
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}
