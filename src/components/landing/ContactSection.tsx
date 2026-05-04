import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2 } from "lucide-react";

const TAMANHOS = [
  { v: "1-10 usuarios", l: "1–10 usuários" },
  { v: "11-50 usuarios", l: "11–50 usuários" },
  { v: "51-200 usuarios", l: "51–200 usuários" },
  { v: "200+ usuarios", l: "200+ usuários" },
];

const OBJETIVOS = [
  { v: "organizar-pipeline", l: "Organizar pipeline" },
  { v: "melhorar-followup", l: "Melhorar follow-up" },
  { v: "automatizar-processos", l: "Automatizar processos" },
  { v: "criar-governanca", l: "Criar governança comercial" },
  { v: "integrar-canais", l: "Integrar canais" },
  { v: "acompanhar-indicadores", l: "Acompanhar indicadores" },
  { v: "falar-com-suporte", l: "Falar com suporte" },
];

const Schema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(180),
  whatsapp: z.string().trim().min(8, "WhatsApp inválido").max(25),
  empresa: z.string().trim().min(1, "Informe a empresa").max(160),
  cargo: z.string().trim().max(120).optional(),
  tamanho_operacao: z.string().min(1, "Selecione o tamanho"),
  objetivo_principal: z.string().min(1, "Selecione o objetivo"),
  mensagem: z.string().trim().max(2000).optional(),
  consentimento_lgpd: z.literal(true, { errorMap: () => ({ message: "Consentimento obrigatório" }) }),
});

type FormState = {
  nome: string; email: string; whatsapp: string; empresa: string;
  cargo: string; tamanho_operacao: string; objetivo_principal: string;
  mensagem: string; consentimento_lgpd: boolean; website: string;
};

const initial: FormState = {
  nome: "", email: "", whatsapp: "", empresa: "", cargo: "",
  tamanho_operacao: "", objetivo_principal: "", mensagem: "",
  consentimento_lgpd: false, website: "",
};

export default function ContactSection() {
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = Schema.safeParse(form);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      Object.entries(parsed.error.flatten().fieldErrors).forEach(([k, v]) => {
        if (v && v[0]) fe[k] = v[0];
      });
      setErrors(fe);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("submit-axis-lead", {
        body: { ...parsed.data, website: form.website },
      });
      if (error) throw error;
      setSuccess(true);
      setForm(initial);
    } catch {
      setErrors({ _root: "Não foi possível enviar agora. Tente novamente em instantes." });
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6]";
  const labelCls = "block text-xs font-semibold text-[#0F172A] mb-1.5";
  const errCls = "mt-1 text-xs text-red-600";

  return (
    <section id="contato" className="py-20 bg-white" aria-labelledby="contato-title">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-[#F97316]">Contato</span>
        <h2
          id="contato-title"
          className="mt-3 text-3xl sm:text-4xl font-extrabold text-[#0F172A]"
          style={{ fontFamily: "Plus Jakarta Sans" }}
        >
          Agende sua demonstração
        </h2>
        <p className="mt-3 text-[#4B5563]">
          Preencha o formulário e a equipa AXIS entrará em contacto para orientar os próximos passos.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {success ? (
          <div className="rounded-2xl border border-[#25D366]/30 bg-[#25D366]/5 p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-[#25D366] mx-auto" />
            <h3 className="mt-3 text-xl font-bold text-[#0F172A]" style={{ fontFamily: "Plus Jakarta Sans" }}>
              Solicitação enviada
            </h3>
            <p className="mt-2 text-[#4B5563]">
              A equipa AXIS entrará em contacto para orientar os próximos passos.
            </p>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm"
            noValidate
          >
            {/* Honeypot */}
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              className="hidden"
              aria-hidden="true"
            />

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className={labelCls} htmlFor="nome">Nome completo *</label>
                <input id="nome" className={inputCls} value={form.nome} onChange={(e) => update("nome", e.target.value)} maxLength={120} />
                {errors.nome && <p className={errCls}>{errors.nome}</p>}
              </div>
              <div>
                <label className={labelCls} htmlFor="email">E-mail corporativo *</label>
                <input id="email" type="email" className={inputCls} value={form.email} onChange={(e) => update("email", e.target.value)} maxLength={180} />
                {errors.email && <p className={errCls}>{errors.email}</p>}
              </div>
              <div>
                <label className={labelCls} htmlFor="whatsapp">WhatsApp *</label>
                <input id="whatsapp" className={inputCls} value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} maxLength={25} placeholder="(00) 00000-0000" />
                {errors.whatsapp && <p className={errCls}>{errors.whatsapp}</p>}
              </div>
              <div>
                <label className={labelCls} htmlFor="empresa">Empresa *</label>
                <input id="empresa" className={inputCls} value={form.empresa} onChange={(e) => update("empresa", e.target.value)} maxLength={160} />
                {errors.empresa && <p className={errCls}>{errors.empresa}</p>}
              </div>
              <div>
                <label className={labelCls} htmlFor="cargo">Cargo</label>
                <input id="cargo" className={inputCls} value={form.cargo} onChange={(e) => update("cargo", e.target.value)} maxLength={120} />
              </div>
              <div>
                <label className={labelCls} htmlFor="tamanho">Tamanho da operação *</label>
                <select id="tamanho" className={inputCls} value={form.tamanho_operacao} onChange={(e) => update("tamanho_operacao", e.target.value)}>
                  <option value="">Selecione...</option>
                  {TAMANHOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
                {errors.tamanho_operacao && <p className={errCls}>{errors.tamanho_operacao}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="objetivo">Principal objetivo *</label>
                <select id="objetivo" className={inputCls} value={form.objetivo_principal} onChange={(e) => update("objetivo_principal", e.target.value)}>
                  <option value="">Selecione...</option>
                  {OBJETIVOS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                {errors.objetivo_principal && <p className={errCls}>{errors.objetivo_principal}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="mensagem">Mensagem</label>
                <textarea id="mensagem" className={`${inputCls} h-24 py-2`} value={form.mensagem} onChange={(e) => update("mensagem", e.target.value)} maxLength={2000} />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-start gap-2 text-sm text-[#4B5563]">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                    checked={form.consentimento_lgpd}
                    onChange={(e) => update("consentimento_lgpd", e.target.checked)}
                  />
                  <span>
                    Autorizo o AXIS a tratar meus dados conforme a LGPD para entrar em contacto sobre esta solicitação.
                  </span>
                </label>
                {errors.consentimento_lgpd && <p className={errCls}>{errors.consentimento_lgpd}</p>}
              </div>
            </div>

            {errors._root && <p className="mt-4 text-sm text-red-600">{errors._root}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full sm:w-auto inline-flex h-12 items-center justify-center px-8 rounded-lg bg-[#3B82F6] text-white font-semibold hover:bg-[#2563EB] disabled:opacity-60 transition-colors"
              style={{ fontFamily: "Plus Jakarta Sans" }}
            >
              {loading ? "Enviando..." : "Enviar solicitação"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
