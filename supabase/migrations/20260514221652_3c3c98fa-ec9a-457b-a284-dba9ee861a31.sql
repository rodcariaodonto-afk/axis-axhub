
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS recurring_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recurring_method text,
  ADD COLUMN IF NOT EXISTS recurring_months integer,
  ADD COLUMN IF NOT EXISTS recurring_start_date date;
