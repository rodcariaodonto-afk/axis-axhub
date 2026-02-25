import axisLogo from "@/assets/axis-logo.png";
import {
  BarChart3, Package, Banknote, MessageCircle, Zap, BrainCircuit, Settings,
  Gauge, UserPlus, Building2, Contact, TrendingUp, FileText, CalendarCheck, FileBarChart,
  Warehouse, Users, ShoppingCart, ArrowDownCircle, Truck,
  ArrowUpCircle, LogOut,
  MessageSquare, Megaphone,
  GitBranch,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
  SidebarHeader, SidebarSeparator,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

interface MenuChild {
  title: string;
  url: string;
  icon: React.ElementType;
  module?: string; // permission module key
}

interface MenuGroup {
  label: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: MenuChild[];
  action?: { label: string; icon: React.ElementType; onClick: () => void };
}

export function AppSidebar() {
  const { signOut } = useAuth();
  const { hasPermission, isAdmin, isLoading: permLoading } = useUserPermissions();
  const location = useLocation();

  const groups: MenuGroup[] = [
    {
      label: "CRM",
      icon: BarChart3,
      defaultOpen: true,
      children: [
        { title: "Dashboard", url: "/crm-dashboard", icon: Gauge, module: "dashboard" },
        { title: "Leads", url: "/leads", icon: UserPlus, module: "crm" },
        { title: "Contas", url: "/accounts", icon: Building2, module: "crm" },
        { title: "Contatos", url: "/contacts", icon: Contact, module: "contatos" },
        { title: "Oportunidades", url: "/opportunities", icon: TrendingUp, module: "crm" },
        { title: "Contratos", url: "/contracts", icon: FileText, module: "crm" },
        { title: "Atividades", url: "/activities", icon: CalendarCheck, module: "crm" },
        { title: "Relatórios", url: "/reports", icon: FileBarChart, module: "relatorios" },
      ],
    },
    {
      label: "ERP",
      icon: Package,
      defaultOpen: true,
      children: [
        { title: "Produtos", url: "/products", icon: Package, module: "produtos" },
        { title: "Estoque", url: "/stock", icon: Warehouse, module: "produtos" },
        { title: "Clientes", url: "/customers", icon: Users, module: "contatos" },
        { title: "Pedidos", url: "/orders", icon: ShoppingCart, module: "produtos" },
        { title: "Compras", url: "/purchases", icon: ArrowDownCircle, module: "produtos" },
        { title: "Fornecedores", url: "/suppliers", icon: Truck, module: "produtos" },
      ],
    },
    {
      label: "Financeiro",
      icon: Banknote,
      children: [
        { title: "Contas a Receber", url: "/receivables", icon: ArrowUpCircle, module: "financeiro" },
        { title: "Contas a Pagar", url: "/payables", icon: ArrowDownCircle, module: "financeiro" },
        { title: "Contas Bancárias", url: "/bank-accounts", icon: Building2, module: "financeiro" },
        { title: "Fluxo de Caixa", url: "/finance", icon: Banknote, module: "financeiro" },
      ],
    },
    {
      label: "Comunicação",
      icon: MessageCircle,
      children: [
        { title: "WhatsApp", url: "/whatsapp", icon: MessageCircle, module: "whatsapp" },
        { title: "Chat Interno", url: "/internal-chat", icon: MessageSquare, module: "whatsapp" },
        { title: "Campanhas", url: "/campanhas", icon: Megaphone, module: "campanhas" },
      ],
    },
    {
      label: "Automação",
      icon: Zap,
      children: [
        { title: "Workflows", url: "/workflows", icon: GitBranch, module: "workflows" },
        { title: "Cadências", url: "/cadences", icon: Zap, module: "automacao" },
      ],
    },
    {
      label: "Inteligência",
      icon: BrainCircuit,
      children: [
        { title: "Business Intelligence", url: "/business-intelligence", icon: BrainCircuit, module: "dashboard" },
      ],
    },
    {
      label: "Administração",
      icon: Settings,
      children: [
        { title: "Configurações", url: "/settings", icon: Settings, module: "configuracoes" },
        { title: "Documentação", url: "/documentation", icon: BookOpen },
      ],
      action: { label: "Sair", icon: LogOut, onClick: signOut },
    },
  ];

  const canViewChild = (child: MenuChild) => {
    if (isAdmin || permLoading) return true;
    if (!child.module) return true;
    return hasPermission(child.module, "view");
  };

  const isGroupActive = (group: MenuGroup) =>
    group.children.some((c) => location.pathname === c.url || location.pathname.startsWith(c.url + "/"));

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-3">
        <div className="flex items-center justify-center">
          <img src={axisLogo} alt="Axis" className="w-full max-w-[180px] h-auto object-contain" />
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarMenu>
          {groups.map((group) => {
            const visibleChildren = group.children.filter(canViewChild);
            if (visibleChildren.length === 0 && !group.action) return null;

            const GroupIcon = group.icon;
            const active = isGroupActive(group);
            return (
              <Collapsible key={group.label} defaultOpen={group.defaultOpen || active} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="font-semibold">
                      <GroupIcon className="h-4 w-4" />
                      <span>{group.label}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {visibleChildren.map((child) => (
                        <SidebarMenuSubItem key={child.url}>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to={child.url}
                              end={child.url === "/"}
                              className="hover:bg-sidebar-accent/50"
                              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                            >
                              <child.icon className="mr-2 h-3.5 w-3.5" />
                              <span>{child.title}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                      {group.action && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <button onClick={group.action.onClick} className="w-full flex items-center hover:bg-sidebar-accent/50">
                              <group.action.icon className="mr-2 h-3.5 w-3.5" />
                              <span>{group.action.label}</span>
                            </button>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
