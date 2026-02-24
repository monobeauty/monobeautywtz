-- Fix RLS for bot_memoria: enable RLS and add authenticated policies
ALTER TABLE public.bot_memoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read bot_memoria"
ON public.bot_memoria FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert bot_memoria"
ON public.bot_memoria FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update bot_memoria"
ON public.bot_memoria FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete bot_memoria"
ON public.bot_memoria FOR DELETE
TO authenticated
USING (true);

-- Fix chat_status: drop overly permissive policies and recreate for authenticated only
DROP POLICY IF EXISTS "Allow public insert access to chat_status" ON public.chat_status;
DROP POLICY IF EXISTS "Allow public read access to chat_status" ON public.chat_status;
DROP POLICY IF EXISTS "Allow public update access to chat_status" ON public.chat_status;

CREATE POLICY "Authenticated users can read chat_status"
ON public.chat_status FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert chat_status"
ON public.chat_status FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update chat_status"
ON public.chat_status FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete chat_status"
ON public.chat_status FOR DELETE
TO authenticated
USING (true);

-- Fix messages: drop overly permissive policies and recreate for authenticated only
DROP POLICY IF EXISTS "Allow public insert access to messages" ON public.messages;
DROP POLICY IF EXISTS "Allow public read access to messages" ON public.messages;

CREATE POLICY "Authenticated users can read messages"
ON public.messages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also allow service_role for edge functions inserting messages
CREATE POLICY "Service role full access to messages"
ON public.messages FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access to chat_status"
ON public.chat_status FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access to bot_memoria"
ON public.bot_memoria FOR ALL
TO service_role
USING (true)
WITH CHECK (true);