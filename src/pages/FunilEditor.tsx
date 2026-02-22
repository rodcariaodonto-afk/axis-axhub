import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FunnelCanvas } from "@/components/funnels/FunnelCanvas";
import { Node, Edge } from "reactflow";

export default function FunilEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: tenantId } = useQuery({
    queryKey: ["tenant-id"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      return data?.tenant_id || "";
    },
    enabled: !!user,
  });

  const { data: funil, isLoading: loadingFunil } = useQuery({
    queryKey: ["funil", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("funis").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: blocosData, isLoading: loadingBlocos } = useQuery({
    queryKey: ["funil-blocos", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("funis_blocos").select("*").eq("funil_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: conexoesData, isLoading: loadingConexoes } = useQuery({
    queryKey: ["funil-conexoes", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("funis_conexoes").select("*").eq("funil_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  if (loadingFunil || loadingBlocos || loadingConexoes || !tenantId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!funil) {
    navigate("/funis");
    return null;
  }

  const initialNodes: Node[] = (blocosData || []).map((b: any) => ({
    id: b.id,
    type: "funnelBlock",
    position: { x: b.posicao_x, y: b.posicao_y },
    data: { tipo: b.tipo, label: b.label, config: b.config || {} },
  }));

  const initialEdges: Edge[] = (conexoesData || []).map((c: any) => ({
    id: c.id,
    source: c.source_bloco_id,
    target: c.target_bloco_id,
    sourceHandle: c.source_handle || undefined,
    targetHandle: c.target_handle || undefined,
    type: "funnelEdge",
    animated: true,
    style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
  }));

  return (
    <FunnelCanvas
      funilId={funil.id}
      funilNome={funil.nome}
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      tenantId={tenantId}
    />
  );
}
