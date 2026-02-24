
-- Add status_atendimento column to bot_memoria with default 'pendente'
ALTER TABLE public.bot_memoria 
ADD COLUMN IF NOT EXISTS status_atendimento text NOT NULL DEFAULT 'pendente';

-- Update existing records to have 'pendente' status
UPDATE public.bot_memoria SET status_atendimento = 'pendente' WHERE status_atendimento IS NULL;
