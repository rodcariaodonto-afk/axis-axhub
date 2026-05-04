import { Check } from "lucide-react";

const PLANOS = [
  {
    nome: "AXIS Start",
    perfil: "Para empresas que querem organizar leads e pipeline.",
    recursos: ["CRM básico", "1 funil comercial", "Gestão de leads", "Tarefas e histórico", "Relatórios essenciais"],
    destaque: false,
  },
  {
    nome: "AXIS Growth",
    perfil: "Para equipas que precisam de automação e previsibilidade.",
    recursos: ["CRM completo", "WhatsApp", "Automações", "Múltiplos funis", "Dashboards", "Suporte prioritário"],
    destaque: false,
  },
  {
    nome: "AXIS Business",
    perfil: "Para operações que exigem governança e IA avançada.",
    recursos: [
      "CRM avançado",
      "Governança comercial",
      "IA Premium",
      "Automações ilimitadas",
      "Dashboards executivos",
      "Permissões e integrações",
    ],
    destaque: true,
  },
  {
    nome: "AXIS Enterprise",
    perfil: "Para empresas com múltiplas unidades e operação complexa.",
    recursos: [
      "API e auditoria",
      "SLA consultivo",
      "Gerente de conta",
      "Workflows customizados",
      "Integrações avançadas",
      "Onboarding dedicado",
    ],
    destaque: false,
  },
];

export default function PlansSection() {
  return (
    <section id="planos" className="py-20 bg-[#EFF6FF]" aria-labelledby="planos-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-[#F97316]">Planos</span>
          <h2
            id="planos-title"
            className="mt-3 text-3xl sm:text-4xl font-extrabold text-[#0F172A]"
            style={{ fontFamily: "Plus Jakarta Sans" }}
          >
            Escolha o plano ideal para sua operação
          </h2>
          <p className="mt-3 text-[#4B5563]">
            Converse com o suporte para identificar a configuração mais adequada para o estágio e a complexidade da sua
            operação comercial.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANOS.map((p) => {
            const isHi = p.destaque;
            return (
              <div
                key={p.nome}
                className={`relative rounded-2xl p-6 flex flex-col ${
                  isHi
                    ? "bg-[#0F172A] text-white ring-1 ring-[#0F172A] shadow-xl"
                    : "bg-white border border-slate-200 shadow-sm"
                }`}
              >
                {isHi && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-[#F97316] text-white shadow">
                    Mais indicado
                  </span>
                )}
                <h3
                  className={`text-xl font-extrabold ${isHi ? "text-white" : "text-[#0F172A]"}`}
                  style={{ fontFamily: "Plus Jakarta Sans" }}
                >
                  {p.nome}
                </h3>
                <p className={`mt-2 text-sm ${isHi ? "text-slate-300" : "text-[#4B5563]"}`}>{p.perfil}</p>

                <ul className="mt-5 space-y-2.5 flex-1">
                  {p.recursos.map((r) => (
                    <li key={r} className="flex items-start gap-2 text-sm">
                      <Check
                        className={`h-4 w-4 mt-0.5 shrink-0 ${isHi ? "text-[#25D366]" : "text-[#3B82F6]"}`}
                        strokeWidth={3}
                      />
                      <span className={isHi ? "text-slate-100" : "text-[#0F172A]"}>{r}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#contato"
                  className={`mt-6 inline-flex h-11 items-center justify-center rounded-lg font-semibold transition-colors ${
                    isHi
                      ? "bg-white text-[#0F172A] hover:bg-slate-100"
                      : "bg-[#25D366] text-white hover:bg-[#1fbb59]"
                  }`}
                  style={{ fontFamily: "Plus Jakarta Sans" }}
                >
                  Falar com Suporte
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
