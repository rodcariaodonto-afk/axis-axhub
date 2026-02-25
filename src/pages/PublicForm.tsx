import { useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, ArrowRight, ArrowLeft, Pencil } from "lucide-react";
import axisLogo from "@/assets/axis-logo.png";
import type { FormQuestion } from "@/components/forms/formSeedData";

type Step = "identify" | "form" | "success";

export default function PublicForm() {
  const { code } = useParams();
  const [step, setStep] = useState<Step>("identify");
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const { data: form, isLoading } = useQuery({
    queryKey: ["public-form", code],
    queryFn: async () => {
      const { data } = await supabase.from("forms").select("*").eq("unique_code", code!).eq("status", "published").single();
      return data as any;
    },
  });

  const questions: FormQuestion[] = form?.form_config || [];
  const sections = [...new Set(questions.map((q) => q.section))];
  const sectionQuestions = questions.filter((q) => q.section === sections[currentSection]);

  const isVisible = (q: FormQuestion) => {
    if (!q.conditionalOn) return true;
    const parentVal = answers[q.conditionalOn.questionId];
    if (Array.isArray(parentVal)) return parentVal.includes(q.conditionalOn.value);
    return parentVal === q.conditionalOn.value;
  };

  const setAnswer = (qId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const toggleCheckbox = (qId: string, option: string) => {
    const current: string[] = answers[qId] || [];
    const updated = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
    setAnswer(qId, updated);
  };

  const handleIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("form");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const { data: inserted, error } = await supabase.from("form_responses").insert({
      form_id: form.id,
      tenant_id: form.tenant_id,
      respondent_name: respondentName,
      respondent_email: respondentEmail,
      response_data: answers,
      completed: true,
    }).select("id").single();
    if (error) { setSubmitting(false); toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" }); return; }

    // Trigger process-form-response automatically
    try {
      await supabase.functions.invoke("process-form-response", {
        body: { form_response_id: inserted.id },
      });
    } catch (e) {
      console.error("[PublicForm] process-form-response invoke error:", e);
    }

    setSubmitting(false);
    setStep("success");
  };

  const isLastSection = currentSection === sections.length - 1;

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!form) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <img src={axisLogo} alt="Axis" className="h-10 mx-auto" />
        <p className="text-muted-foreground">Formulário não encontrado ou não está publicado.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border py-4 px-6 flex items-center justify-center">
        <img src={axisLogo} alt="Axis" className="h-8" />
      </header>

      <main className="max-w-2xl mx-auto py-8 px-4">
        {step === "identify" && (
          <Card className="border-border bg-card">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">{form.name}</CardTitle>
              {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
              <p className="text-sm text-muted-foreground mt-2">Por favor, identifique-se para começar</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleIdentify} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input value={respondentName} onChange={(e) => setRespondentName(e.target.value)} required placeholder="Seu nome completo" />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={respondentEmail} onChange={(e) => setRespondentEmail(e.target.value)} required placeholder="seu@email.com" />
                </div>
                <Button type="submit" className="w-full">
                  Continuar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "form" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Respondendo como: <strong>{respondentName}</strong>
                <Button variant="link" size="sm" className="ml-1 h-auto p-0" onClick={() => setStep("identify")}>
                  <Pencil className="h-3 w-3 mr-1" />Editar
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">Seção {currentSection + 1} de {sections.length}</span>
            </div>

            <Progress value={((currentSection + 1) / sections.length) * 100} className="h-2" />

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">{sections[currentSection]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {sectionQuestions.filter(isVisible).map((q) => (
                  <div key={q.id} className="space-y-2">
                    <Label className="text-sm">
                      {q.label} {q.required && <span className="text-destructive">*</span>}
                    </Label>

                    {(q.type === "text" || q.type === "email" || q.type === "phone") && (
                      <Input
                        type={q.type === "email" ? "email" : q.type === "phone" ? "tel" : "text"}
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        required={q.required}
                      />
                    )}

                    {q.type === "number" && (
                      <Input
                        type="number"
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        required={q.required}
                      />
                    )}

                    {q.type === "textarea" && (
                      <Textarea
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        required={q.required}
                        rows={3}
                      />
                    )}

                    {q.type === "radio" && q.options && (
                      <RadioGroup value={answers[q.id] || ""} onValueChange={(v) => setAnswer(q.id, v)}>
                        {q.options.map((opt) => (
                          <div key={opt} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                            <Label htmlFor={`${q.id}-${opt}`} className="font-normal text-sm">{opt}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {q.type === "checkbox" && q.options && (
                      <div className="space-y-2">
                        {q.options.map((opt) => (
                          <div key={opt} className="flex items-center space-x-2">
                            <Checkbox
                              checked={(answers[q.id] || []).includes(opt)}
                              onCheckedChange={() => toggleCheckbox(q.id, opt)}
                              id={`${q.id}-${opt}`}
                            />
                            <Label htmlFor={`${q.id}-${opt}`} className="font-normal text-sm">{opt}</Label>
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === "select" && q.options && (
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {q.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              {currentSection > 0 && (
                <Button variant="outline" onClick={() => setCurrentSection((s) => s - 1)} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />Anterior
                </Button>
              )}
              {!isLastSection ? (
                <Button onClick={() => setCurrentSection((s) => s + 1)} className="flex-1">
                  Próxima Seção <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                  {submitting ? "Enviando..." : "Enviar Formulário"}
                </Button>
              )}
            </div>
          </div>
        )}

        {step === "success" && (
          <Card className="border-border bg-card text-center">
            <CardContent className="py-12 space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">Obrigado!</h2>
              <p className="text-muted-foreground">Suas respostas foram enviadas com sucesso.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
