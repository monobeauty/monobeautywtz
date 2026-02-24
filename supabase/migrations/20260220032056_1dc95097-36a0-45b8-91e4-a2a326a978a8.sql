
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read configuracoes_sistema"
ON public.configuracoes_sistema
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update configuracoes_sistema"
ON public.configuracoes_sistema
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert configuracoes_sistema"
ON public.configuracoes_sistema
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete configuracoes_sistema"
ON public.configuracoes_sistema
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Service role full access to configuracoes_sistema"
ON public.configuracoes_sistema
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
