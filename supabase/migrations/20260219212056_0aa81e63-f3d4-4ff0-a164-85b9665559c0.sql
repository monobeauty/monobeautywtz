
CREATE TABLE public.messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  instance_name TEXT NOT NULL,
  remote_jid TEXT NOT NULL,
  push_name TEXT,
  message_text TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'received'
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to messages"
ON public.messages FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access to messages"
ON public.messages FOR INSERT
WITH CHECK (true);

ALTER TABLE public.messages REPLICA IDENTITY FULL;

CREATE INDEX idx_messages_instance ON public.messages (instance_name);
CREATE INDEX idx_messages_timestamp ON public.messages (timestamp);
CREATE INDEX idx_messages_remote_jid ON public.messages (remote_jid);
