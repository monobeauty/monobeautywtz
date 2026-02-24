
CREATE OR REPLACE FUNCTION public.auto_create_bot_memoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_from_me = false THEN
    -- Upsert bot_memoria: create if not exists, reset to pendente if exists
    INSERT INTO public.bot_memoria (telefone, status_atendimento)
    VALUES (
      split_part(NEW.remote_jid, '@', 1),
      'pendente'
    )
    ON CONFLICT (telefone) DO UPDATE
    SET status_atendimento = 'pendente';

    -- Reopen chat_status if closed, clearing operator
    UPDATE public.chat_status
    SET status = 'open', closed_at = NULL, operador_nome = NULL, operador_id = NULL, updated_at = now()
    WHERE remote_jid = NEW.remote_jid AND status = 'closed';
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists on messages table
DROP TRIGGER IF EXISTS trg_auto_create_bot_memoria ON public.messages;
CREATE TRIGGER trg_auto_create_bot_memoria
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_bot_memoria();
