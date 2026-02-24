import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ReportBuilderVisual } from "@/components/reports/ReportBuilderVisual";
import { getDefaultConfig, type VisualReportConfig } from "@/components/reports/reportObjectFields";
import PageLoader from "@/components/PageLoader";

export default function ReportBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reportName, setReportName] = useState("");
  const [objectName, setObjectName] = useState("");
  const [config, setConfig] = useState<VisualReportConfig>(getDefaultConfig("accounts"));

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await (supabase.from as any)("reports").select("*").eq("id", id).single();
      if (error || !data) { toast.error("Relatório não encontrado"); navigate("/reports"); return; }
      setReportName(data.name);
      setObjectName(data.object_name || "accounts");
      const savedConfig = data.config as any;
      if (savedConfig?.selectedFields) {
        setConfig(savedConfig as VisualReportConfig);
      } else {
        setConfig(getDefaultConfig(data.object_name || "accounts"));
      }
      setLoading(false);
    })();
  }, [id, navigate]);

  const handleSave = async () => {
    if (!user || !id) return;
    setSaving(true);
    try {
      const { error } = await (supabase.from as any)("reports").update({
        name: reportName,
        config: config as any,
        last_run_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
      toast.success("Relatório salvo com sucesso");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <ReportBuilderVisual
      objectName={objectName}
      reportName={reportName}
      config={config}
      onConfigChange={setConfig}
      onNameChange={setReportName}
      onSave={handleSave}
      onBack={() => navigate("/reports")}
      saving={saving}
    />
  );
}
