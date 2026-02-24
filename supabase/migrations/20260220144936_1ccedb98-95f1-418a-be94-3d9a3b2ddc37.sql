
-- Add nome to perfis_usuarios
ALTER TABLE public.perfis_usuarios 
ADD COLUMN IF NOT EXISTS nome text;

-- Add operador info to chat_status
ALTER TABLE public.chat_status 
ADD COLUMN IF NOT EXISTS operador_id uuid,
ADD COLUMN IF NOT EXISTS operador_nome text;
