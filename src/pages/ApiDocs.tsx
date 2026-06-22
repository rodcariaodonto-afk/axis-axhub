import { ApiDocsPage } from "@/components/api-management/ApiDocsPage";

export default function ApiDocs() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documentação da API</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Referência completa dos endpoints REST, autenticação, rate limiting e webhooks.
        </p>
      </div>
      <ApiDocsPage />
    </div>
  );
}
