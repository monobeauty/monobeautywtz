-- Enable RLS on setores_atendimento
ALTER TABLE public.setores_atendimento ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can read setores"
ON public.setores_atendimento FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert setores"
ON public.setores_atendimento FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update setores"
ON public.setores_atendimento FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete setores"
ON public.setores_atendimento FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Service role full access to setores"
ON public.setores_atendimento FOR ALL
TO service_role
USING (true)
WITH CHECK (true);