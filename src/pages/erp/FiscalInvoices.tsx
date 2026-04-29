import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarIcon, Search, MoreHorizontal, Download, FileText, X } from "lucide-react";
import { Link } from "react-router-dom";

type DateRange = { from?: Date; to?: Date };

const statusBadge = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s === "autorizada") return <Badge className="bg-green-600 hover:bg-green-700">Autorizada</Badge>;
  if (s === "cancelada") return <Badge variant="secondary">Cancelada</Badge>;
  if (["erro", "rejeitada"].includes(s)) return <Badge variant="destructive">{s === "rejeitada" ? "Rejeitada" : "Erro"}</Badge>;
  return <Badge className="bg-amber-500 hover:bg-amber-600">Processando</Badge>;
};

export default function FiscalInvoices() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [envFilter, setEnvFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>({});

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["fiscal-invoices-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fiscal_invoices")
        .select("*, orders(number, total, customers(name))")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return invoices.filter((inv: any) => {
      if (statusFilter !== "all" && (inv.status || "").toLowerCase() !== statusFilter) return false;
      if (typeFilter !== "all" && (inv.type || "").toLowerCase() !== typeFilter) return false;
      if (envFilter !== "all" && inv.focus_environment !== envFilter) return false;
      if (dateRange.from) {
        const created = new Date(inv.created_at);
        if (created < dateRange.from) return false;
        if (dateRange.to && created > dateRange.to) return false;
      }
      if (search.trim()) {
        const s = search.toLowerCase();
        const num = (inv.numero || "").toLowerCase();
        const customer = (inv.orders?.customers?.name || "").toLowerCase();
        if (!num.includes(s) && !customer.includes(s)) return false;
      }
      return true;
    });
  }, [invoices, statusFilter, typeFilter, envFilter, dateRange, search]);

  const downloadDocument = (invoice: any, kind: "danfe" | "xml") => {
    const path = kind === "danfe" ? invoice.caminho_danfe : invoice.caminho_xml;
    if (!path) {
      toast({ title: "Documento ainda não disponível", variant: "destructive" });
      return;
    }
    const base = invoice.focus_environment === "producao"
      ? "https://api.focusnfe.com.br"
      : "https://homologacao.focusnfe.com.br";
    const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const clearFilters = () => {
    setSearch(""); setStatusFilter("all"); setTypeFilter("all"); setEnvFilter("all"); setDateRange({});
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notas Fiscais</h1>
        <p className="text-muted-foreground">Histórico completo de NF-e e NFS-e emitidas via Focus NFe.</p>
      </div>

      {/* Filtros */}
      <Card className="border-border bg-card">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Período</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal h-10 w-full", !dateRange.from && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to
                        ? `${format(dateRange.from, "dd/MM/yy")} – ${format(dateRange.to, "dd/MM/yy")}`
                        : format(dateRange.from, "dd/MM/yyyy")
                    ) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange as any}
                    onSelect={(r: any) => setDateRange(r || {})}
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="processando">Processando</SelectItem>
                  <SelectItem value="autorizada">Autorizada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="erro">Erro</SelectItem>
                  <SelectItem value="rejeitada">Rejeitada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="nfe">NF-e</SelectItem>
                  <SelectItem value="nfse">NFS-e</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ambiente</Label>
              <Select value={envFilter} onValueChange={setEnvFilter}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="homologacao">Homologação</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-10"
                  placeholder="Nº nota ou cliente"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          {(search || statusFilter !== "all" || typeFilter !== "all" || envFilter !== "all" || dateRange.from) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-2 h-3 w-3" /> Limpar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Número/Série</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ambiente</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    {invoices.length === 0 ? "Nenhuma nota fiscal emitida ainda" : "Nenhum resultado para os filtros aplicados"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((inv: any) => {
                  const canDownload = (inv.status || "").toLowerCase() === "autorizada";
                  return (
                    <TableRow key={inv.id} className="border-border">
                      <TableCell className="text-sm">
                        {format(new Date(inv.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase">{inv.type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {inv.numero || "—"}{inv.serie ? ` / ${inv.serie}` : ""}
                      </TableCell>
                      <TableCell className="text-sm">
                        {inv.orders?.number ? (
                          <Link to="/orders" className="text-primary hover:underline font-mono text-xs">{inv.orders.number}</Link>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{inv.orders?.customers?.name || "—"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {inv.orders?.total != null ? `R$ ${Number(inv.orders.total).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell>{statusBadge(inv.status)}</TableCell>
                      <TableCell>
                        <Badge variant={inv.focus_environment === "producao" ? "default" : "secondary"}>
                          {inv.focus_environment === "producao" ? "Produção" : "Homologação"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canDownload && inv.caminho_danfe && (
                              <DropdownMenuItem onClick={() => downloadDocument(inv, "danfe")}>
                                <Download className="mr-2 h-4 w-4" />Baixar DANFE
                              </DropdownMenuItem>
                            )}
                            {canDownload && inv.caminho_xml && (
                              <DropdownMenuItem onClick={() => downloadDocument(inv, "xml")}>
                                <FileText className="mr-2 h-4 w-4" />Baixar XML
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => toast({ title: "Funcionalidade em construção", description: "Cancelamento de nota será implementado em breve." })}
                              className="text-destructive focus:text-destructive"
                            >
                              <X className="mr-2 h-4 w-4" />Cancelar Nota
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
