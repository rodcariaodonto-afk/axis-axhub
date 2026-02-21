import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Settings2, Trash2, Upload, ImageIcon } from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  type: string;
  category: string | null;
  price: number;
  cost: number | null;
  is_active: boolean;
  image_url: string | null;
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
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) { setUploading(false); return; }

    const { data: product, error } = await supabase.from("products").insert({
      tenant_id: profile.tenant_id,
      sku: form.sku,
      name: form.name,
      type: form.type,
      category: form.category || null,
      price: parseFloat(form.price) || 0,
      cost: parseFloat(form.cost) || 0,
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
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
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

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

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
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setImageFile(null); setImagePreview(null); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo Produto</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Produto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>Imagem do Produto</Label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors min-h-[120px]"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="max-h-28 rounded-md object-contain" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Clique para enviar imagem</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG até 5MB</p>
                      </>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  {imageFile && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{imageFile.name}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setImageFile(null); setImagePreview(null); }}>Remover</Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SKU</Label>
                    <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product">Produto</SelectItem>
                        <SelectItem value="service">Serviço</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preço</Label>
                    <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Custo</Label>
                    <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
                  </div>
                </div>

                {/* Dynamic custom fields */}
                {customFields.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <p className="text-sm font-medium text-muted-foreground">Campos Personalizados</p>
                    {customFields.map((field) => (
                      <div key={field.id} className="space-y-1">
                        <Label>{field.field_name}{field.is_required && " *"}</Label>
                        {field.field_type === "select" ? (
                          <Select value={customValues[field.id] || ""} onValueChange={(v) => setCustomValues({ ...customValues, [field.id]: v })}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              {field.options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : field.field_type === "boolean" ? (
                          <div className="flex items-center gap-2">
                            <Switch checked={customValues[field.id] === "true"} onCheckedChange={(v) => setCustomValues({ ...customValues, [field.id]: v ? "true" : "false" })} />
                            <span className="text-sm text-muted-foreground">{customValues[field.id] === "true" ? "Sim" : "Não"}</span>
                          </div>
                        ) : (
                          <Input
                            type={field.field_type === "number" ? "number" : "text"}
                            value={customValues[field.id] || ""}
                            onChange={(e) => setCustomValues({ ...customValues, [field.id]: e.target.value })}
                            required={field.is_required}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={uploading}>{uploading ? "Criando..." : "Criar Produto"}</Button>
              </form>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8 + customFields.length} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8 + customFields.length} className="text-center py-8 text-muted-foreground">Nenhum produto encontrado</TableCell></TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id} className="border-border">
                    <TableCell>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.type === "product" ? "Produto" : "Serviço"}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.category || "—"}</TableCell>
                    <TableCell className="text-right">R$ {Number(p.price).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">R$ {Number(p.cost || 0).toFixed(2)}</TableCell>
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
