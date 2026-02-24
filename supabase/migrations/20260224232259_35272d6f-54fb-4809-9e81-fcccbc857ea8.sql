
CREATE OR REPLACE FUNCTION public.count_leads_by_source()
RETURNS TABLE(label text, value bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(source, 'desconhecido') AS label, COUNT(*) AS value
  FROM leads
  WHERE tenant_id = get_user_tenant_id()
  GROUP BY source
  ORDER BY value DESC
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.count_leads_by_status()
RETURNS TABLE(label text, value bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(status, 'unknown') AS label, COUNT(*) AS value
  FROM leads
  WHERE tenant_id = get_user_tenant_id()
  GROUP BY status
  ORDER BY value DESC
  LIMIT 20;
$$;
