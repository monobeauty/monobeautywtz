
-- Add UNIQUE constraint on telefone (required for ON CONFLICT)
ALTER TABLE public.bot_memoria ADD CONSTRAINT bot_memoria_telefone_unique UNIQUE (telefone);

-- Create function to auto-insert bot_memoria when incoming message arrives
CREATE OR REPLACE FUNCTION public.auto_create_bot_memoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.is_from_me = false THEN
    INSERT INTO public.bot_memoria (telefone, status_atendimento)
    VALUES (
      split_part(NEW.remote_jid, '@', 1),
      'pendente'
    )
    ON CONFLICT (telefone) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on messages table
CREATE TRIGGER trg_auto_bot_memoria
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_bot_memoria();
