
-- Add new columns to reports table
ALTER TABLE public.reports 
  ADD COLUMN IF NOT EXISTS report_type VARCHAR(50) DEFAULT 'table',
  ADD COLUMN IF NOT EXISTS object_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON public.reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_object_name ON public.reports(object_name);
CREATE INDEX IF NOT EXISTS idx_reports_is_active ON public.reports(is_active);
CREATE INDEX IF NOT EXISTS idx_reports_is_favorite ON public.reports(is_favorite);

-- Trigger for updated_at (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_reports_updated_at' AND tgrelid = 'public.reports'::regclass
  ) THEN
    CREATE TRIGGER update_reports_updated_at
      BEFORE UPDATE ON public.reports
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
