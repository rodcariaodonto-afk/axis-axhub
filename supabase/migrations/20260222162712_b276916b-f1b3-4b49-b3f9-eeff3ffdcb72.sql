
-- Create whatsapp-media storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('whatsapp-media', 'whatsapp-media', true);

-- Allow public read access
CREATE POLICY "Public read whatsapp media"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-media');

-- Allow service role to upload (edge functions use service role)
CREATE POLICY "Service role can upload whatsapp media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'whatsapp-media');

CREATE POLICY "Service role can update whatsapp media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'whatsapp-media');
