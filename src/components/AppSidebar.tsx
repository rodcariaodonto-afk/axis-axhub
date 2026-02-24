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
  const location = useLocation();

  const groups: MenuGroup[] = [
    {
      label: "CRM",
      icon: BarChart3,
      defaultOpen: true,
      children: [
        { title: "Dashboard", url: "/crm-dashboard", icon: Gauge },
        { title: "Leads", url: "/leads", icon: UserPlus },
        { title: "Contas", url: "/accounts", icon: Building2 },
        { title: "Contatos", url: "/contacts", icon: Contact },
        { title: "Oportunidades", url: "/opportunities", icon: TrendingUp },
        { title: "Contratos", url: "/contracts", icon: FileText },
        { title: "Atividades", url: "/activities", icon: CalendarCheck },
        { title: "Relatórios", url: "/reports", icon: FileBarChart },
      ],
    },
    {
      label: "ERP",
      icon: Package,
      defaultOpen: true,
      children: [
        { title: "Produtos", url: "/products", icon: Package },
        { title: "Estoque", url: "/stock", icon: Warehouse },
        { title: "Clientes", url: "/customers", icon: Users },
        { title: "Pedidos", url: "/orders", icon: ShoppingCart },
        { title: "Compras", url: "/purchases", icon: ArrowDownCircle },
        { title: "Fornecedores", url: "/suppliers", icon: Truck },
      ],
    },
    {
      label: "Financeiro",
      icon: Banknote,
      children: [
        { title: "Contas a Receber", url: "/receivables", icon: ArrowUpCircle },
        { title: "Contas a Pagar", url: "/payables", icon: ArrowDownCircle },
        { title: "Contas Bancárias", url: "/bank-accounts", icon: Building2 },
        { title: "Fluxo de Caixa", url: "/finance", icon: Banknote },
      ],
    },
    {
      label: "Comunicação",
      icon: MessageCircle,
      children: [
        { title: "WhatsApp", url: "/whatsapp", icon: MessageCircle },
        { title: "Chat Interno", url: "/internal-chat", icon: MessageSquare },
        { title: "Campanhas", url: "/campanhas", icon: Megaphone },
      ],
    },
    {
      label: "Automação",
      icon: Zap,
      children: [
        { title: "Workflows", url: "/workflows", icon: GitBranch },
        { title: "Cadências", url: "/cadences", icon: Zap },
      ],
    },
    {
      label: "Inteligência",
      icon: BrainCircuit,
      children: [
        { title: "Business Intelligence", url: "/business-intelligence", icon: BrainCircuit },
      ],
    },
    {
      label: "Administração",
      icon: Settings,
      children: [
        { title: "Configurações", url: "/settings", icon: Settings },
        { title: "Documentação", url: "/documentation", icon: BookOpen },
      ],
      action: { label: "Sair", icon: LogOut, onClick: signOut },
    },
  ];

  const isGroupActive = (group: MenuGroup) =>
    group.children.some((c) => location.pathname === c.url || location.pathname.startsWith(c.url + "/"));

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img src={axisLogo} alt="Axis" className="h-12" />
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarMenu>
          {groups.map((group) => {
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
                      {group.children.map((child) => (
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
