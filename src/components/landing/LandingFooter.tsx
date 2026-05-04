const LINKS = [
  { href: "#solucoes", label: "CRM" },
  { href: "#solucoes", label: "Governança" },
  { href: "#solucoes", label: "WhatsApp" },
  { href: "#solucoes", label: "Automações" },
  { href: "#solucoes", label: "IA" },
  { href: "#planos", label: "Planos" },
  { href: "#contato", label: "Contato" },
];

export default function LandingFooter() {
  return (
    <footer className="bg-[#0F172A] text-slate-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-2xl font-extrabold text-white" style={{ fontFamily: "Plus Jakarta Sans" }}>
              AXIS
            </p>
            <p className="mt-1 text-sm text-slate-400 max-w-md">
              CRM de Governança Comercial com IA para empresas que vendem com processo, controlo e previsibilidade.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Rodapé">
            {LINKS.map((l) => (
              <a key={l.label} href={l.href} className="text-sm text-slate-300 hover:text-white transition-colors">
                {l.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:justify-between gap-2 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} AXIS. Todos os direitos reservados.</p>
          <p>Feito com governança, processo e IA.</p>
        </div>
      </div>
    </footer>
  );
}
