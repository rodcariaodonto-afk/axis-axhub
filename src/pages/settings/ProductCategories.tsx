import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Copy, Upload, Download, Search, Package } from "lucide-react";

const NICHES = [
  { value: "all", label: "Todos" },
  { value: "varejo", label: "Varejo" },
  { value: "servicos", label: "Serviços" },
  { value: "saude", label: "Saúde" },
  { value: "manufatura", label: "Manufatura" },
  { value: "b2b", label: "B2B" },
  { value: "imobiliario", label: "Imobiliário" },
  { value: "educacao", label: "Educação" },
];

const NICHE_LABELS: Record<string, string> = {
  varejo: "Varejo",
  servicos: "Serviços",
  saude: "Saúde",
  manufatura: "Manufatura",
  b2b: "B2B",
  imobiliario: "Imobiliário",
  educacao: "Educação",
};

type CategoryTemplate = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  product_type: string;
  niche: string | null;
  sku_required: boolean | null;
  track_inventory: boolean | null;
  allowed_variations: string[] | null;
  custom_fields: any;
  is_popular: boolean | null;
  usage_count: number | null;
};

type ProductCategory = {
  id: string;
  name: string;
  created_at: string;
  tenant_id: string;
  icon: string | null;
  description: string | null;
  product_type: string | null;
  niche: string | null;
  sku_required: boolean | null;
  track_inventory: boolean | null;
  allowed_variations: string[] | null;
  custom_fields: any;
  template_id: string | null;
  cloned_from_id: string | null;
  is_active: boolean | null;
};

export default function ProductCategories() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  // Dialog state
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [nicheField, setNicheField] = useState("");
  const [productType, setProductType] = useState("produto");

  // Filters
  const [search, setSearch] = useState("");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [templateNicheFilter, setTemplateNicheFilter] = useState("all");

  const { data: tenantId } = useQuery({
    queryKey: ["my-tenant-id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_tenant_id");
      return data as string;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["product-categories", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_categories")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("name");
      return (data || []) as ProductCategory[];
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["category-templates"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("category_templates")
        .select("*")
        .order("name");
      return (data || []) as CategoryTemplate[];
    },
  });

  // Filtered categories
  const filteredCategories = categories?.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchNiche = nicheFilter === "all" || c.niche === nicheFilter;
    return matchSearch && matchNiche;
  });

  // Filtered templates
  const filteredTemplates = templates?.filter((t) => {
    const matchNiche = templateNicheFilter === "all" || t.niche === templateNicheFilter;
    return matchNiche;
  });

  // Packs grouped by niche
  const packs = NICHES.filter((n) => n.value !== "all").map((n) => {
    const count = templates?.filter((t) => t.niche === n.value).length || 0;
    return { ...n, count };
  }).filter((p) => p.count > 0);

  const save = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Missing");
      const payload: any = {
        name,
        icon: icon || null,
        description: description || null,
        niche: nicheField || null,
        product_type: productType,
      };
      if (editId) {
        const { error } = await supabase
          .from("product_categories")
          .update(payload)
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("product_categories")
          .insert({ ...payload, tenant_id: tenantId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-categories"] });
      closeDialog();
      toast({ title: "Categoria salva" });
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-categories"] });
      toast({ title: "Categoria removida" });
    },
  });

  const closeDialog = () => {
    setOpen(false);
    setEditId(null);
    setName("");
    setIcon("");
    setDescription("");
    setNicheField("");
    setProductType("produto");
  };

  const openEdit = (c: ProductCategory) => {
    setEditId(c.id);
    setName(c.name);
    setIcon(c.icon || "");
    setDescription(c.description || "");
    setNicheField(c.niche || "");
    setProductType(c.product_type || "produto");
    setOpen(true);
  };

  const openNew = () => {
    closeDialog();
    setOpen(true);
  };

  const handleUseTemplate = async (t: CategoryTemplate) => {
    if (!tenantId) return;
    const { error } = await supabase.from("product_categories").insert({
      tenant_id: tenantId,
      name: t.name,
      icon: t.icon,
      description: t.description,
      niche: t.niche,
      product_type: t.product_type,
      sku_required: t.sku_required,
      track_inventory: t.track_inventory,
      allowed_variations: t.allowed_variations,
      custom_fields: t.custom_fields,
      template_id: t.id,
    } as any);
    if (error) {
      toast({ title: "Erro ao criar categoria", variant: "destructive" });
    } else {
      qc.invalidateQueries({ queryKey: ["product-categories"] });
      toast({ title: `Categoria "${t.name}" criada a partir do template` });
    }
  };

  const handleClone = async (c: ProductCategory) => {
    if (!tenantId) return;
    const { error } = await supabase.from("product_categories").insert({
      tenant_id: tenantId,
      name: `${c.name} (cópia)`,
      icon: c.icon,
      description: c.description,
      niche: c.niche,
      product_type: c.product_type,
      sku_required: c.sku_required,
      track_inventory: c.track_inventory,
      allowed_variations: c.allowed_variations,
      custom_fields: c.custom_fields,
      cloned_from_id: c.id,
    } as any);
    if (error) {
      toast({ title: "Erro ao clonar", variant: "destructive" });
    } else {
      qc.invalidateQueries({ queryKey: ["product-categories"] });
      toast({ title: `Categoria "${c.name}" clonada` });
    }
  };

  const handleImportPack = async (niche: string, nicheLabel: string) => {
    if (!tenantId) return;
    const nicheTemplates = templates?.filter((t) => t.niche === niche) || [];
    if (!nicheTemplates.length) return;

    const rows = nicheTemplates.map((t) => ({
      tenant_id: tenantId,
      name: t.name,
      icon: t.icon,
      description: t.description,
      niche: t.niche,
      product_type: t.product_type,
      sku_required: t.sku_required,
      track_inventory: t.track_inventory,
      allowed_variations: t.allowed_variations,
      custom_fields: t.custom_fields,
      template_id: t.id,
    }));

    const { error } = await supabase.from("product_categories").insert(rows as any);
    if (error) {
      toast({ title: `Erro ao importar pack ${nicheLabel}`, variant: "destructive" });
    } else {
      qc.invalidateQueries({ queryKey: ["product-categories"] });
      toast({ title: `Pack "${nicheLabel}" importado com ${nicheTemplates.length} categorias` });

      // Log import
      await supabase.from("category_import_logs" as any).insert({
        tenant_id: tenantId,
        file_name: `pack_${niche}`,
        total_rows: nicheTemplates.length,
        successful_imports: nicheTemplates.length,
        failed_imports: 0,
        status: "completed",
      });
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      toast({ title: "CSV vazio ou inválido", variant: "destructive" });
      return;
    }

    const header = lines[0].toLowerCase();
    const hasHeader = header.includes("nome") || header.includes("name");
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const rows: any[] = [];
    const errors: any[] = [];

    dataLines.forEach((line, i) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const catName = cols[0];
      if (!catName) {
        errors.push({ line: i + 1, error: "Nome vazio" });
        return;
      }
      rows.push({
        tenant_id: tenantId,
        name: catName,
        icon: cols[1] || null,
        niche: cols[2] || null,
        product_type: cols[3] || "produto",
      });
    });

    let successful = 0;
    let failed = errors.length;

    if (rows.length > 0) {
      const results = await Promise.allSettled(
        rows.map((r) => supabase.from("product_categories").insert(r as any))
      );
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && !r.value.error) {
          successful++;
        } else {
          failed++;
          const errMsg = r.status === "rejected" ? r.reason : r.value.error?.message;
          errors.push({ line: i + 1, error: errMsg });
        }
      });
    }

    // Log import
    await supabase.from("category_import_logs" as any).insert({
      tenant_id: tenantId,
      file_name: file.name,
      total_rows: dataLines.length,
      successful_imports: successful,
      failed_imports: failed,
      errors: errors.length > 0 ? errors : null,
      status: "completed",
    });

    qc.invalidateQueries({ queryKey: ["product-categories"] });
    toast({
      title: `Importação concluída: ${successful} ok, ${failed} erros`,
      variant: failed > 0 ? "destructive" : "default",
    });

    // Reset input
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle>Categorias de Produtos</CardTitle>
        <div className="flex gap-2 flex-wrap">
          <input
            type="file"
            accept=".csv"
            ref={fileRef}
            className="hidden"
            onChange={handleImportCSV}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1" />
            Importar CSV
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Categoria
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="my-categories">
          <TabsList className="mb-4">
            <TabsTrigger value="my-categories">Minhas Categorias</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="packs">Packs por Nicho</TabsTrigger>
          </TabsList>

          {/* TAB: Minhas Categorias */}
          <TabsContent value="my-categories">
            <div className="flex gap-2 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar categoria..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={nicheFilter} onValueChange={setNicheFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filtrar nicho" />
                </SelectTrigger>
                <SelectContent>
                  {NICHES.map((n) => (
                    <SelectItem key={n.value} value={n.value}>
                      {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Nicho</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.icon && <span className="mr-1">{c.icon}</span>}
                      {c.name}
                    </TableCell>
                    <TableCell>
                      {c.niche ? (
                        <Badge variant="secondary">
                          {NICHE_LABELS[c.niche] || c.niche}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{c.product_type || "produto"}</TableCell>
                    <TableCell>
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Clonar"
                        onClick={() => handleClone(c)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove.mutate(c.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!filteredCategories?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhuma categoria encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* TAB: Templates */}
          <TabsContent value="templates">
            <div className="flex gap-2 mb-4">
              <Select value={templateNicheFilter} onValueChange={setTemplateNicheFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar nicho" />
                </SelectTrigger>
                <SelectContent>
                  {NICHES.map((n) => (
                    <SelectItem key={n.value} value={n.value}>
                      {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground self-center">
                {filteredTemplates?.length || 0} templates disponíveis
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTemplates?.map((t) => (
                <div
                  key={t.id}
                  className="border border-border rounded-lg p-3 flex flex-col gap-2 bg-card hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{t.icon || "📁"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.description || t.product_type}
                      </p>
                    </div>
                    {t.is_popular && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">
                      {NICHE_LABELS[t.niche || ""] || t.niche}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleUseTemplate(t)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Usar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB: Packs por Nicho */}
          <TabsContent value="packs">
            <p className="text-sm text-muted-foreground mb-4">
              Importe todas as categorias de um nicho com um clique.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {packs.map((p) => (
                <div
                  key={p.value}
                  className="border border-border rounded-lg p-4 flex flex-col gap-3 bg-card hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-semibold">{p.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.count} categorias
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleImportPack(p.value, p.label)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Importar Pack
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Dialog Nova/Editar Categoria */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editId ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ícone (emoji)</Label>
                <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="📁" />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={productType} onValueChange={setProductType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="produto">Produto</SelectItem>
                    <SelectItem value="servico">Serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nicho</Label>
              <Select value={nicheField || "none"} onValueChange={(v) => setNicheField(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {NICHES.filter((n) => n.value !== "all").map((n) => (
                    <SelectItem key={n.value} value={n.value}>
                      {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => save.mutate()}
              disabled={!name.trim() || save.isPending}
            >
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
