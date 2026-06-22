Deploy the following Lovable Cloud Edge Functions from `supabase/functions/`:

1. `dispatch-webhook`
2. `api-gateway`
3. `approve-nf-step`
4. `process-scheduled-repasses`
5. `check-document-expiry`
6. `check-contract-expiry`

Technical steps:
- Validate that each function has a valid `index.ts` entry point under `supabase/functions/<name>/index.ts`.
- Use the Supabase deployment tool to push all six functions to the Lovable Cloud backend.
- Verify deployment status for each function and surface any errors (e.g., CORS, import/lockfile, or runtime issues).
- If a deployment fails, inspect the function code for common edge-runtime problems (Deno lockfile drift, missing `corsHeaders`, or incompatible imports) and retry.

No frontend or database changes are required.