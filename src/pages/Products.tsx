import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Settings2, Trash2, ImageIcon, Pencil, ChevronRight, ChevronDown } from "lucide-react";
import ProductFormDynamic from "@/components/products/ProductFormDynamic";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const parseBRCurrency = (v: string): number => {
  if (!v) return 0;
  if (v.includes(",")) return parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;
  return parseFloat(v) || 0;
};

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  type: string;
  category: string | null;
  price: number;
  cost: number | null;
  is_active: boolean;
  image_url: string | null;
  parent_id: string | null;
  is_parent: boolean;
  is_subscription: boolean;
  billing_cycle: string | null;
  plan_tier: string | null;
}

interface CustomField {
  id: string;
  field_name: string;
  field_type: string;
  options: string[];
  is_required: boolean;
  sort_order: number;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fieldsDialogOpen, setFieldsDialogOpen] = useState(false);
  const [form, setForm] = useState({ sku: "", name: "", type: "product", category: "", price: "", cost: "" });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [productCustomValues, setProductCustomValues] = useState<Record<string, Record<string, string>>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({ sku: "", name: "", description: "", type: "product", category: "", price: "", cost: "" });
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [editUploading, setEditUploading] = useState(false);
  // Field management
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const { toast } = useToast();

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setProducts((data as Product[]) || []);
    }
    setLoading(false);
  };

  const fetchCustomFields = async () => {
    const { data } = await supabase.from("product_custom_fields").select("*").order("sort_order");
    setCustomFields((data as CustomField[]) || []);
  };

  const fetchAllCustomValues = async () => {
    const { data } = await supabase.from("product_custom_values").select("*");
    const map: Record<string, Record<string, string>> = {};
    (data || []).forEach((v: any) => {
      if (!map[v.product_id]) map[v.product_id] = {};
      map[v.product_id][v.field_id] = v.value || "";
    });
    setProductCustomValues(map);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("product_categories").select("id, name").order("name");
    setCategories((data as {id: string, name: string}[]) || []);
  };

  useEffect(() => {
    fetchProducts();
    fetchCustomFields();
    fetchAllCustomValues();
    fetchCategories();
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Selecione um arquivo de imagem", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem muito grande (máx. 5MB)", variant: "destructive" });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (productId: string): Promise<string | null> => {
    if (!imageFile) return null;
    const ext = imageFile.name.split(".").pop();
    const path = `${productId}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, imageFile, { upsert: true });
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!profile) { setUploading(false); return; }

    const { data: product, error } = await supabase.from("products").insert({
      tenant_id: profile.tenant_id,
      sku: form.sku,
      name: form.name,
      type: form.type,
      category: form.category || null,
      price: parseBRCurrency(form.price),
      cost: parseBRCurrency(form.cost),
    }).select().single();

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    if (product) {
      // Upload image
      if (imageFile) {
        const imageUrl = await uploadImage(product.id);
        if (imageUrl) {
          await supabase.from("products").update({ image_url: imageUrl }).eq("id", product.id);
        }
      }

      // Save custom field values
      const valuesToInsert = Object.entries(customValues)
        .filter(([_, v]) => v.trim() !== "")
        .map(([fieldId, value]) => ({
          tenant_id: profile.tenant_id,
          product_id: product.id,
          field_id: fieldId,
          value,
        }));
      if (valuesToInsert.length > 0) {
        await supabase.from("product_custom_values").insert(valuesToInsert);
      }
    }

    toast({ title: "Produto criado!" });
    setForm({ sku: "", name: "", type: "product", category: "", price: "", cost: "" });
    setCustomValues({});
    setImageFile(null);
    setImagePreview(null);
    setDialogOpen(false);
    setUploading(false);
    fetchProducts();
    fetchAllCustomValues();
  };

  const addCustomField = async () => {
    if (!newFieldName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!profile) return;
    const { error } = await supabase.from("product_custom_fields").insert({
      tenant_id: profile.tenant_id,
      field_name: newFieldName,
      field_type: newFieldType,
      options: newFieldType === "select" ? newFieldOptions.split(",").map((o) => o.trim()).filter(Boolean) : [],
      is_required: newFieldRequired,
      sort_order: customFields.length,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Campo criado!" });
      setNewFieldName(""); setNewFieldType("text"); setNewFieldOptions(""); setNewFieldRequired(false);
      fetchCustomFields();
    }
  };

  const deleteCustomField = async (id: string) => {
    await supabase.from("product_custom_fields").delete().eq("id", id);
    toast({ title: "Campo removido!" });
    fetchCustomFields();
    fetchAllCustomValues();
  };

  const handleEdit = (p: Product) => {
    setEditProduct(p);
    setEditForm({
      sku: p.sku,
      name: p.name,
      description: p.description || "",
      type: p.type,
      category: p.category || "",
      price: String(p.price),
      cost: String(p.cost || ""),
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editProduct) return;
    setEditUploading(true);
    const { error } = await supabase.from("products").update({
      sku: editForm.sku,
      name: editForm.name,
      description: editForm.description || null,
      type: editForm.type,
      category: editForm.category || null,
      price: parseBRCurrency(editForm.price),
      cost: parseBRCurrency(editForm.cost),
    }).eq("id", editProduct.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Produto atualizado!" });
      setEditDialogOpen(false);
      setEditProduct(null);
      fetchProducts();
    }
    setEditUploading(false);
  };

  const handleDelete = async () => {
    if (!deleteProduct) return;
    const { error } = await supabase.from("products").delete().eq("id", deleteProduct.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Produto excluído!" });
      fetchProducts();
      fetchAllCustomValues();
    }
    setDeleteProduct(null);
  };

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const toggleParent = (id: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Separate parents from children; only show top-level (no parent_id) and expanded children
  const topLevel = filtered.filter((p) => !p.parent_id);
  const childrenMap: Record<string, Product[]> = {};
  filtered.forEach((p) => {
    if (p.parent_id) {
      if (!childrenMap[p.parent_id]) childrenMap[p.parent_id] = [];
      childrenMap[p.parent_id].push(p);
    }
  });

  const getMinPrice = (parentId: string) => {
    const children = childrenMap[parentId];
    if (!children || children.length === 0) return null;
    return Math.min(...children.map((c) => c.price));
  };

  const getTypeBadge = (p: Product) => {
    if (p.is_parent && p.is_subscription) return <Badge className="bg-primary/20 text-primary border-primary/30">SaaS</Badge>;
    if (p.is_subscription && p.plan_tier) return <Badge variant="outline" className="text-xs">{p.plan_tier}</Badge>;
    return <Badge variant="secondary">{p.type === "product" ? "Produto" : "Serviço"}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">Gerencie seu catálogo de produtos e serviços</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFieldsDialogOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />Campos
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo Produto</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo Produto</DialogTitle>
              </DialogHeader>
              <ProductFormDynamic
                categories={categories}
                customFields={customFields}
                onSuccess={() => { fetchProducts(); fetchAllCustomValues(); }}
                onClose={() => setDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Custom Fields Management Dialog */}
      <Dialog open={fieldsDialogOpen} onOpenChange={setFieldsDialogOpen}>
        <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Gerenciar Campos Personalizados</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Nome do Campo</Label>
                <Input value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} placeholder="Ex: Cor, Tamanho, Peso..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={newFieldType} onValueChange={setNewFieldType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="boolean">Sim/Não</SelectItem>
                      <SelectItem value="select">Lista de opções</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex items-end gap-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={newFieldRequired} onCheckedChange={setNewFieldRequired} />
                    <Label>Obrigatório</Label>
                  </div>
                </div>
              </div>
              {newFieldType === "select" && (
                <div className="space-y-2">
                  <Label>Opções (separadas por vírgula)</Label>
                  <Input value={newFieldOptions} onChange={(e) => setNewFieldOptions(e.target.value)} placeholder="Ex: Pequeno, Médio, Grande" />
                </div>
              )}
              <Button onClick={addCustomField} disabled={!newFieldName.trim()} className="w-full">
                <Plus className="mr-2 h-4 w-4" />Adicionar Campo
              </Button>
            </div>

            {customFields.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-sm font-medium text-muted-foreground">Campos Existentes</p>
                {customFields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between p-3 rounded-md border border-border">
                    <div>
                      <span className="font-medium text-sm">{field.field_name}</span>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">{field.field_type === "text" ? "Texto" : field.field_type === "number" ? "Número" : field.field_type === "boolean" ? "Sim/Não" : "Lista"}</Badge>
                        {field.is_required && <Badge variant="secondary" className="text-xs">Obrigatório</Badge>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteCustomField(field.id)} className="h-8 w-8">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="w-12" />
                <TableHead>SKU</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                {customFields.map((f) => <TableHead key={f.id}>{f.field_name}</TableHead>)}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9 + customFields.length} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : topLevel.length === 0 ? (
                <TableRow><TableCell colSpan={9 + customFields.length} className="text-center py-8 text-muted-foreground">Nenhum produto encontrado</TableCell></TableRow>
              ) : (
                topLevel.flatMap((p) => {
                  const hasChildren = !!childrenMap[p.id]?.length;
                  const isExpanded = expandedParents.has(p.id);
                  const minPrice = getMinPrice(p.id);
                  const rows = [
                    <TableRow key={p.id} className={`border-border ${hasChildren ? "cursor-pointer" : ""}`} onClick={hasChildren ? () => toggleParent(p.id) : undefined}>
                      <TableCell>
                        {hasChildren ? (
                          <div className="flex items-center gap-1">
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="h-8 w-8 rounded object-cover" />
                            ) : (
                              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        ) : (
                          p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="h-8 w-8 rounded object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{getTypeBadge(p)}</TableCell>
                      <TableCell className="text-muted-foreground">{p.category || "—"}</TableCell>
                      <TableCell className="text-right">
                        {p.is_parent && minPrice != null
                          ? <span className="text-xs text-muted-foreground">A partir de R$ {minPrice.toFixed(2)}</span>
                          : `R$ ${Number(p.price).toFixed(2)}`}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {p.is_parent ? "—" : `R$ ${Number(p.cost || 0).toFixed(2)}`}
                      </TableCell>
                      {customFields.map((f) => (
                        <TableCell key={f.id} className="text-muted-foreground">
                          {productCustomValues[p.id]?.[f.id] || "—"}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Badge variant={p.is_active ? "default" : "secondary"}>
                          {p.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEdit(p); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setDeleteProduct(p); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ];
                  // Render children if expanded
                  if (isExpanded && childrenMap[p.id]) {
                    childrenMap[p.id].forEach((child) => {
                      rows.push(
                        <TableRow key={child.id} className="border-border bg-muted/30">
                          <TableCell><div className="ml-6 h-8 w-8" /></TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{child.sku}</TableCell>
                          <TableCell className="text-muted-foreground pl-6">{child.plan_tier || child.name}</TableCell>
                          <TableCell>{getTypeBadge(child)}</TableCell>
                          <TableCell className="text-muted-foreground">{child.billing_cycle || "—"}</TableCell>
                          <TableCell className="text-right">R$ {Number(child.price).toFixed(2)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">R$ {Number(child.cost || 0).toFixed(2)}</TableCell>
                          {customFields.map((f) => (
                            <TableCell key={f.id} className="text-muted-foreground">—</TableCell>
                          ))}
                          <TableCell>
                            <Badge variant={child.is_active ? "default" : "secondary"}>
                              {child.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(child)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteProduct(child)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  }
                  return rows;
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Descrição do produto..."
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Produto</SelectItem>
                  <SelectItem value="service">Serviço</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={editForm.category || "__none__"} onValueChange={(v) => setEditForm({ ...editForm, category: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {categories.map((cat) => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço</Label>
                <Input type="text" inputMode="decimal" placeholder="0,00" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value.replace(/[^0-9.,]/g, "") })} />
              </div>
              <div className="space-y-2">
                <Label>Custo</Label>
                <Input type="text" inputMode="decimal" placeholder="0,00" value={editForm.cost} onChange={(e) => setEditForm({ ...editForm, cost: e.target.value.replace(/[^0-9.,]/g, "") })} />
              </div>
            </div>
            <Button className="w-full" onClick={handleEditSave} disabled={editUploading}>
              {editUploading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProduct} onOpenChange={(open) => !open && setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteProduct?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
