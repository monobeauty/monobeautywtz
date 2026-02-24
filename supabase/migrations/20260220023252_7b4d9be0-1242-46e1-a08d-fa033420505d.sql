
-- Create chat_status table
CREATE TABLE public.chat_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  remote_jid TEXT NOT NULL UNIQUE,
  instance_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_status ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (same pattern as messages table)
CREATE POLICY "Allow public read access to chat_status"
ON public.chat_status FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to chat_status"
ON public.chat_status FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to chat_status"
ON public.chat_status FOR UPDATE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_status;

-- Trigger: auto-reopen on new message
CREATE OR REPLACE FUNCTION public.reopen_chat_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_status
  SET status = 'open', updated_at = now()
  WHERE remote_jid = NEW.remote_jid AND status = 'closed';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER reopen_chat_on_message_insert
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.reopen_chat_on_new_message();

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_chat_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_chat_status_updated_at
BEFORE UPDATE ON public.chat_status
FOR EACH ROW
EXECUTE FUNCTION public.update_chat_status_updated_at();
