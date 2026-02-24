import axisLogo from "@/assets/axis-logo.png";
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart, Users, Truck,
  Banknote, Building2, ArrowDownCircle, ArrowUpCircle, LogOut, Settings,
  UserPlus, Kanban, CalendarCheck, BarChart3, Contact, FileText, Gauge, Zap, TrendingUp, BookOpen, FileBarChart, GitBranch, MessageCircle, Megaphone, MessageSquare, BrainCircuit,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, SidebarSeparator,
} from "@/components/ui/sidebar";

const mainItems = [{ title: "Dashboard", url: "/", icon: LayoutDashboard }];
const erpItems = [
  { title: "Produtos", url: "/products", icon: Package },
  { title: "Estoque", url: "/stock", icon: Warehouse },
  { title: "Clientes", url: "/customers", icon: Users },
  { title: "Pedidos", url: "/orders", icon: ShoppingCart },
];
const purchaseItems = [
  { title: "Fornecedores", url: "/suppliers", icon: Truck },
  { title: "Compras", url: "/purchases", icon: ArrowDownCircle },
];
const financeItems = [
  { title: "A Receber", url: "/receivables", icon: ArrowUpCircle },
  { title: "A Pagar", url: "/payables", icon: ArrowDownCircle },
  { title: "Contas Bancárias", url: "/bank-accounts", icon: Building2 },
  { title: "Financeiro", url: "/finance", icon: Banknote },
];
const crmItems = [
  { title: "Dashboard CRM", url: "/crm-dashboard", icon: Gauge },
  { title: "Leads", url: "/leads", icon: UserPlus },
  { title: "Kanban", url: "/pipeline", icon: Kanban },
  { title: "Contatos", url: "/contacts", icon: Contact },
  { title: "Propostas", url: "/proposals", icon: FileText },
  { title: "Atividades", url: "/activities", icon: CalendarCheck },
  { title: "Cadências", url: "/cadences", icon: Zap },
  { title: "Funil", url: "/funnel-report", icon: BarChart3 },
  { title: "Forecasting", url: "/forecasting", icon: TrendingUp },
  { title: "Contratos", url: "/contracts", icon: FileText },
  { title: "Relatórios", url: "/reports", icon: FileBarChart },
  { title: "Workflows", url: "/workflows", icon: GitBranch },
  { title: "Funis de Venda", url: "/funis", icon: Zap },
];

export function AppSidebar() {
  const { signOut } = useAuth();

  const renderGroup = (label: string, items: typeof mainItems) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink to={item.url} end={item.url === "/"} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                  <item.icon className="mr-2 h-4 w-4" /><span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img src={axisLogo} alt="Axis" className="h-12" />
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        {renderGroup("Principal", mainItems)}
        {renderGroup("Operação", erpItems)}
        {renderGroup("Compras", purchaseItems)}
        {renderGroup("Financeiro", financeItems)}
        {renderGroup("CRM", crmItems)}
        {renderGroup("Comunicação", [{ title: "WhatsApp", url: "/whatsapp", icon: MessageCircle }, { title: "Chat Interno", url: "/internal-chat", icon: MessageSquare }, { title: "Campanhas", url: "/campanhas", icon: Megaphone }])}
        {renderGroup("Inteligência", [{ title: "Business Intelligence", url: "/business-intelligence", icon: BrainCircuit }])}
        {renderGroup("Conhecimento", [{ title: "Documentação", url: "/documentation", icon: BookOpen }])}
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/settings" className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                <Settings className="mr-2 h-4 w-4" /><span>Configurações</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}><LogOut className="mr-2 h-4 w-4" /><span>Sair</span></SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
