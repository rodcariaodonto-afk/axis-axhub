
-- Add funil_id column to forms table to link a form to a sales funnel
ALTER TABLE public.forms ADD COLUMN funil_id uuid REFERENCES public.funis(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_forms_funil_id ON public.forms(funil_id);
