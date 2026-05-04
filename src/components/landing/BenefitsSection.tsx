import { Layers, ShieldCheck, BarChart3 } from "lucide-react";

const BENEFICIOS = [
  {
    icon: Layers,
    color: "bg-[#3B82F6]/10 text-[#3B82F6]",
    title: "Vendas e operação conectadas",
    desc: "Integre CRM e ERP para acompanhar oportunidades, propostas, pedidos, contratos e financeiro sem duplicidade de dados.",
  },
  {
    icon: ShieldCheck,
    color: "bg-[#F97316]/10 text-[#F97316]",
    title: "Governança com rastreabilidade",
    desc: "Padronize processos, controle permissões, acompanhe responsabilidades e mantenha histórico confiável para decisões executivas.",
  },
  {
    icon: BarChart3,
    color: "bg-[#25D366]/10 text-[#25D366]",
    title: "Visão 360° da empresa",
    desc: "Tenha dashboards com pipeline, atendimento, faturamento/faturação, contas, produtividade, conversão e gargalos operacionais.",
  },
];

export default function BenefitsSection() {
  return (
    <section id="beneficios" className="py-20 bg-[#F8FAFC]" aria-labelledby="benef-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-[#F97316]">Resultados reais</span>
        <h2
          id="benef-title"
          className="mt-3 text-3xl sm:text-4xl font-extrabold text-[#0F172A]"
          style={{ fontFamily: "Plus Jakarta Sans" }}
        >
          Resultados reais para o seu negócio
        </h2>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {BENEFICIOS.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="text-center px-4">
              <div className={`h-14 w-14 rounded-xl ${color} flex items-center justify-center mx-auto`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3
                className="mt-5 text-lg font-bold text-[#0F172A]"
                style={{ fontFamily: "Plus Jakarta Sans" }}
              >
                {title}
              </h3>
              <p className="mt-2 text-sm text-[#4B5563] max-w-xs mx-auto">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
