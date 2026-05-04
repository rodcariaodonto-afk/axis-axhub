import { Check } from "lucide-react";
import DashboardMockup from "./DashboardMockup";
import { SUPPORT_WHATSAPP_DEFAULT } from "./supportLink";

const PROVAS = [
  { titulo: "Operação integrada", desc: "CRM, ERP e atendimento em uma plataforma" },
  { titulo: "Governança e rastreabilidade", desc: "Processos padronizados e auditáveis" },
  { titulo: "IA nativa", desc: "Insights e produtividade no dia a dia" },
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
            Plataforma CRM + ERP + Governança com IA
          </span>

          <h1
            className="mt-5 text-[40px] sm:text-[48px] lg:text-[54px] leading-[1.05] tracking-tight font-extrabold text-[#0F172A]"
            style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
          >
            O Sistema Operacional das PMEs com CRM, ERP, Governança e{" "}
            <span className="text-[#3B82F6]">Inteligência Artificial</span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-[#4B5563] max-w-xl" style={{ fontFamily: "Inter, sans-serif" }}>
            Centralize CRM, ERP, pipeline, atendimento, WhatsApp, propostas, financeiro, automações, dashboards e
            governança em uma única plataforma com IA nativa. O AXIS elimina ferramentas fragmentadas e dá visão
            integrada da operação.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <a
              href={SUPPORT_WHATSAPP_DEFAULT}
              target="_blank"
              rel="noopener noreferrer"
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
