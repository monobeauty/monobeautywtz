ALTER TABLE public.messages ADD COLUMN status text DEFAULT 'sent';
COMMENT ON COLUMN public.messages.status IS 'Message delivery status: sent, delivered, read';