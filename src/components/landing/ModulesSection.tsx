import { Users, Filter, ShieldCheck, MessageCircle, Zap, Sparkles } from "lucide-react";

const MODULOS = [
  { icon: Users, title: "CRM Nativo", desc: "Gestão de clientes, leads, histórico, pipeline e follow-up automatizado." },
  { icon: Filter, title: "Pipeline Comercial", desc: "Funis personalizáveis, etapas, previsão de fechamento e motivos de perda." },
  { icon: ShieldCheck, title: "Governança Comercial", desc: "Regras, permissões, responsabilidades, rastreabilidade e padronização do processo." },
  { icon: MessageCircle, title: "WhatsApp IA", desc: "Atendimento automatizado, central de conversas e registro do relacionamento." },
  { icon: Zap, title: "Automações", desc: "Fluxos de trabalho sem código com integrações, N8N, Zapier, Make e webhooks." },
  { icon: Sparkles, title: "Copiloto IA", desc: "Inteligência artificial para priorizar oportunidades, resumir históricos e sugerir próximos passos." },
];

export default function ModulesSection() {
  return (
    <section id="solucoes" className="py-20 bg-white" aria-labelledby="modulos-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-[#F97316]">Tudo em um só lugar</span>
          <h2
            id="modulos-title"
            className="mt-3 text-3xl sm:text-4xl font-extrabold text-[#0F172A]"
            style={{ fontFamily: "Plus Jakarta Sans" }}
          >
            6 módulos. 1 plataforma.
          </h2>
          <p className="mt-3 text-[#4B5563]" style={{ fontFamily: "Inter" }}>
            Elimine ferramentas fragmentadas e tenha visão 360° da sua operação comercial.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {MODULOS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl bg-white border border-slate-200 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-[#3B82F6]/30 transition-all"
            >
              <div className="h-11 w-11 rounded-lg bg-[#EFF6FF] flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-[#3B82F6]" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: "Plus Jakarta Sans" }}>
                {title}
              </h3>
              <p className="mt-2 text-sm text-[#4B5563] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
