-- Create trigger to auto-reopen chats when a new message arrives
CREATE TRIGGER reopen_chat_on_new_message_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.reopen_chat_on_new_message();