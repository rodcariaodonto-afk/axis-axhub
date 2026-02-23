
-- =============================================
-- PARTE 1: Colunas de relacionamento
-- =============================================

-- orders.deal_id -> deals
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL;

-- receivables.deal_id -> deals
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL;

-- receivables.order_id -> orders (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='receivables' AND column_name='order_id') THEN
    ALTER TABLE public.receivables ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- customers.crm_contact_id -> contacts
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS crm_contact_id UUID UNIQUE REFERENCES public.contacts(id) ON DELETE SET NULL;

-- deals.payment_status
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Pendente';

-- Indices
CREATE INDEX IF NOT EXISTS idx_orders_deal_id ON public.orders(deal_id);
CREATE INDEX IF NOT EXISTS idx_receivables_deal_id ON public.receivables(deal_id);
CREATE INDEX IF NOT EXISTS idx_receivables_order_id ON public.receivables(order_id);
CREATE INDEX IF NOT EXISTS idx_customers_crm_contact_id ON public.customers(crm_contact_id);

-- =============================================
-- PARTE 2: Trigger 1 - Sincronizar contato CRM -> Customer ERP
-- =============================================
CREATE OR REPLACE FUNCTION public.sync_contact_to_customer()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if customer already linked
  IF EXISTS (SELECT 1 FROM public.customers WHERE crm_contact_id = NEW.id) THEN
    UPDATE public.customers SET
      name = CONCAT(NEW.first_name, COALESCE(' ' || NEW.last_name, '')),
      email = NEW.email,
      phone = NEW.phone
    WHERE crm_contact_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_contact_to_customer ON public.contacts;
CREATE TRIGGER trg_sync_contact_to_customer
AFTER INSERT OR UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.sync_contact_to_customer();

-- =============================================
-- PARTE 3: Trigger 2 - Deal won -> auto-create order (server-side safety net)
-- =============================================
CREATE OR REPLACE FUNCTION public.on_deal_won()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
  v_contact_name TEXT;
BEGIN
  -- Only fire when status changes to 'won'
  IF NEW.status = 'won' AND (OLD.status IS NULL OR OLD.status <> 'won') THEN
    -- Skip if order already exists for this deal (frontend may have created it)
    IF EXISTS (SELECT 1 FROM public.orders WHERE deal_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    -- Try to find/create customer from contact
    IF NEW.contact_id IS NOT NULL THEN
      SELECT id INTO v_customer_id FROM public.customers WHERE crm_contact_id = NEW.contact_id;
      IF v_customer_id IS NULL THEN
        SELECT CONCAT(first_name, COALESCE(' ' || last_name, '')) INTO v_contact_name FROM public.contacts WHERE id = NEW.contact_id;
        INSERT INTO public.customers (tenant_id, name, crm_contact_id)
        VALUES (NEW.tenant_id, COALESCE(v_contact_name, 'Cliente'), NEW.contact_id)
        RETURNING id INTO v_customer_id;
      END IF;
    END IF;

    -- Create order
    INSERT INTO public.orders (tenant_id, number, customer_id, deal_id, source, status, total, subtotal, notes)
    VALUES (
      NEW.tenant_id,
      'PED-' || UPPER(TO_HEX(EXTRACT(EPOCH FROM NOW())::BIGINT)),
      v_customer_id,
      NEW.id,
      'crm',
      'draft',
      COALESCE(NEW.estimated_value, 0),
      COALESCE(NEW.estimated_value, 0),
      'Gerado automaticamente do deal: ' || NEW.name
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_on_deal_won ON public.deals;
CREATE TRIGGER trg_on_deal_won
AFTER UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.on_deal_won();

-- =============================================
-- PARTE 4: Trigger 3 - Recebível pago -> atualiza pedido e deal
-- =============================================
CREATE OR REPLACE FUNCTION public.on_receivable_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
  v_deal_id UUID;
  v_total_receivables NUMERIC;
  v_paid_receivables NUMERIC;
  v_new_payment_status VARCHAR(50);
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status <> 'paid') THEN
    -- Get related order_id
    v_order_id := NEW.order_id;
    
    IF v_order_id IS NOT NULL THEN
      -- Check all receivables for this order
      SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)
      INTO v_total_receivables, v_paid_receivables
      FROM public.receivables WHERE order_id = v_order_id;

      -- Update order paid_status
      IF v_paid_receivables >= v_total_receivables THEN
        UPDATE public.orders SET paid_status = 'paid' WHERE id = v_order_id;
      ELSE
        UPDATE public.orders SET paid_status = 'partial' WHERE id = v_order_id;
      END IF;

      -- Get deal_id from order
      SELECT deal_id INTO v_deal_id FROM public.orders WHERE id = v_order_id;
    ELSE
      v_deal_id := NEW.deal_id;
    END IF;

    -- Update deal payment_status
    IF v_deal_id IS NOT NULL THEN
      IF v_order_id IS NOT NULL AND v_paid_receivables >= v_total_receivables THEN
        v_new_payment_status := 'Pago';
      ELSE
        v_new_payment_status := 'Parcial';
      END IF;
      UPDATE public.deals SET payment_status = v_new_payment_status WHERE id = v_deal_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_on_receivable_paid ON public.receivables;
CREATE TRIGGER trg_on_receivable_paid
AFTER UPDATE ON public.receivables
FOR EACH ROW EXECUTE FUNCTION public.on_receivable_paid();
