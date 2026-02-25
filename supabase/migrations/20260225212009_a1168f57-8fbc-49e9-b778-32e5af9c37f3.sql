
-- Install pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Recreate trigger function with hardcoded URL (no more current_setting)
CREATE OR REPLACE FUNCTION public.notify_form_response_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_service_role_key text;
BEGIN
  -- Get service role key from vault
  SELECT decrypted_secret INTO v_service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF v_service_role_key IS NULL THEN
    RAISE LOG 'notify_form_response_created: SUPABASE_SERVICE_ROLE_KEY not found in vault';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://dgybxarkvmaajfeesqdv.supabase.co/functions/v1/process-form-response',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object('form_response_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_form_response_created error: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Recreate the trigger (drop if exists, then create)
DROP TRIGGER IF EXISTS on_form_response_created ON public.form_responses;
CREATE TRIGGER on_form_response_created
  AFTER INSERT ON public.form_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_form_response_created();
