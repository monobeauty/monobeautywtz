
-- 1. Rename old table
ALTER TABLE public.messages RENAME TO messages_old;

-- 2. Create new table with desired structure
CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_name text NOT NULL,
  remote_jid text NOT NULL,
  push_name text,
  message_text text,
  is_from_me boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. Migrate existing data
INSERT INTO public.messages (instance_name, remote_jid, push_name, message_text, is_from_me, created_at)
SELECT
  instance_name,
  remote_jid,
  push_name,
  message_text,
  CASE WHEN status = 'sent' THEN true ELSE false END,
  timestamp
FROM public.messages_old;

-- 4. Drop old table
DROP TABLE public.messages_old;

-- 5. Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 6. Recreate RLS policies
CREATE POLICY "Allow public read access to messages"
  ON public.messages FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to messages"
  ON public.messages FOR INSERT
  WITH CHECK (true);

-- 7. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
