ALTER TABLE public.whatsapp_meta_messages REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_contacts REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_meta_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_contacts;