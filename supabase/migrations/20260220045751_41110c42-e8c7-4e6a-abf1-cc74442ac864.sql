CREATE POLICY "Authenticated users can delete messages"
ON public.messages
FOR DELETE
USING (true);