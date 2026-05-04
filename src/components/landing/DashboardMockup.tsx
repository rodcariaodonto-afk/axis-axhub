export default function DashboardMockup() {
  return (
    <div className="relative">
      <div className="rounded-2xl bg-[#0F172A] shadow-2xl ring-1 ring-white/10 overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#0B1220]">
          <span className="h-3 w-3 rounded-full bg-[#FF5F56]" />
          <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
          <span className="h-3 w-3 rounded-full bg-[#27C93F]" />
          <div className="ml-3 flex-1 max-w-xs">
            <div className="h-6 rounded-md bg-white/5 text-[11px] text-slate-400 flex items-center px-3">
              app.axis.com.br
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Receita prevista", value: "R$ 284k", color: "text-[#3B82F6]" },
              { label: "Leads ativos", value: "1.248", color: "text-white" },
              { label: "Conversão", value: "34%", color: "text-[#25D366]" },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">{m.label}</p>
                <p className={`mt-1 text-xl font-bold ${m.color}`} style={{ fontFamily: "Plus Jakarta Sans" }}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-300">Pipeline comercial</p>
              <span className="text-[10px] text-slate-500">últimos 30 dias</span>
            </div>
            <div className="flex items-end gap-2 h-24">
              {[40, 65, 50, 80, 55, 90, 70, 95, 60, 85, 75, 100].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-[#1d4ed8] to-[#3B82F6]"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {["WhatsApp ativo", "CRM ativo", "Governança ativa"].map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 text-[11px] text-slate-200 bg-white/5 ring-1 ring-white/10 rounded-full px-2.5 py-1"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" /> {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Floating IA card */}
      <div className="hidden sm:block absolute -bottom-6 -left-6 rounded-xl bg-white shadow-xl ring-1 ring-slate-200 p-4 max-w-[230px]">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center">
            <span className="text-[#3B82F6] font-bold text-sm">IA</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#0F172A]" style={{ fontFamily: "Plus Jakarta Sans" }}>
              Copiloto IA
            </p>
            <p className="text-[11px] text-[#4B5563]">3 insights gerados</p>
          </div>
        </div>
      </div>
    </div>
  );
}
