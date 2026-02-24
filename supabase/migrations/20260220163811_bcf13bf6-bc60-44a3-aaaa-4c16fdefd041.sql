
CREATE OR REPLACE FUNCTION public.auto_create_bot_memoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.is_from_me = false THEN
    -- Auto-create bot_memoria with pendente status
    INSERT INTO public.bot_memoria (telefone, status_atendimento)
    VALUES (
      split_part(NEW.remote_jid, '@', 1),
      'pendente'
    )
    ON CONFLICT (telefone) DO NOTHING;

    -- Reopen chat_status if it was closed
    UPDATE public.chat_status
    SET status = 'open', closed_at = NULL, updated_at = now()
    WHERE remote_jid = NEW.remote_jid AND status = 'closed';
  END IF;
  RETURN NEW;
END;
$$;
