import { Building2, LogOut, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import axisLogo from "@/assets/axis-logo.svg";
import type { PJTenantAccess } from "@/hooks/usePJPortalAccess";

interface PJTenantSelectorProps {
  tenants: PJTenantAccess[];
  onSelect: (access: PJTenantAccess) => void;
  userEmail: string;
  onSignOut: () => void;
}

export function PJTenantSelector({ tenants, onSelect, userEmail, onSignOut }: PJTenantSelectorProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <img src={axisLogo} alt="AXIS" className="h-6 w-auto" />
          <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
            Portal PJ
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{userEmail}</span>
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={onSignOut} className="gap-1.5 text-muted-foreground">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Selecione a empresa</h1>
            <p className="text-muted-foreground mt-1">
              Você tem acesso ao portal em {tenants.length} empresas.
            </p>
          </div>

          <div className="grid gap-3">
            {tenants.map((access) => (
              <Card
                key={`${access.tenant_id}-${access.pj_id}`}
                className="cursor-pointer border-border bg-card hover:bg-accent/50 transition-colors group"
                onClick={() => onSelect(access)}
              >
                <CardHeader className="flex flex-row items-center gap-4 py-4 px-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base leading-tight">{access.tenant_name}</CardTitle>
                    <CardDescription className="text-xs mt-0.5 capitalize">
                      Nível de acesso: {access.access_level}
                    </CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
