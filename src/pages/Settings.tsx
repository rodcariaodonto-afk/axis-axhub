import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie sua conta e preferências</p>
      </div>
      <Card className="border-border bg-card">
        <CardHeader><CardTitle>Conta</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm"><span className="text-muted-foreground">E-mail:</span> {user?.email}</p>
          <p className="text-sm"><span className="text-muted-foreground">ID:</span> <span className="font-mono text-xs">{user?.id}</span></p>
        </CardContent>
      </Card>
    </div>
  );
}
