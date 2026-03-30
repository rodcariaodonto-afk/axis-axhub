ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'pix';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS installments integer NOT NULL DEFAULT 1;