CREATE TRIGGER on_new_message_auto_bot_memoria
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_bot_memoria();