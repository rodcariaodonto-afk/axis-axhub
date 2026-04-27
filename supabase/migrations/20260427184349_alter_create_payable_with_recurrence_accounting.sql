-- ============================================================================
-- Migration: Alterar create_payable_with_recurrence para herdar campos contábeis
-- Slice 2 (sub-passo 2.A) — RPC aceita accounting_type e accounting_group
-- Data: 2026-04-27
-- ============================================================================
-- Mudança: adiciona p_accounting_type e p_accounting_group ao RPC
-- Retrocompatível: parâmetros novos têm DEFAULT NULL
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.create_payable_with_recurrence(
  p_tenant_id uuid,
  p_description text,
  p_amount numeric,
  p_due_date date,
  p_supplier_id uuid,
  p_category_id uuid,
  p_frequency_type text,
  p_frequency_interval integer,
  p_end_date date DEFAULT NULL::date,
  p_accounting_type text DEFAULT NULL,
  p_accounting_group text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_payable_id UUID;
  v_recurrence_id UUID;
  v_next_date DATE;
BEGIN
  -- Criar conta a pagar template (agora com campos contábeis)
  INSERT INTO payables (
    tenant_id, description, amount, due_date, supplier_id, category_id,
    is_recurring_template, status, accounting_type, accounting_group
  )
  VALUES (
    p_tenant_id, p_description, p_amount, p_due_date, p_supplier_id, p_category_id,
    true, 'pending', p_accounting_type, p_accounting_group
  )
  RETURNING id INTO v_payable_id;

  -- Calcular próxima data
  v_next_date := calculate_next_recurrence_date(p_due_date, p_frequency_type, p_frequency_interval);

  -- Criar registro de recorrência
  INSERT INTO payment_recurrences (
    tenant_id, original_account_id, frequency_type, frequency_interval,
    start_date, end_date, next_generation_date, status
  ) VALUES (
    p_tenant_id, v_payable_id, p_frequency_type, p_frequency_interval,
    p_due_date, p_end_date, v_next_date, 'active'
  ) RETURNING id INTO v_recurrence_id;

  -- Vincular conta à recorrência
  UPDATE payables SET recurrence_id = v_recurrence_id WHERE id = v_payable_id;

  RETURN v_payable_id;
END;
$function$;

COMMIT;
