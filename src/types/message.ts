export type MediaType = "image" | "audio" | "video" | "document" | "sticker" | null;

export interface Message {
  id: string;
  instance_name: string;
  remote_jid: string;
  push_name: string | null;
  message_text: string | null;
  is_from_me: boolean;
  created_at: string;
  media_type?: MediaType;
  media_url?: string | null;
  media_mimetype?: string | null;
  media_filename?: string | null;
  whatsapp_id?: string | null;
  status?: string | null;
  _seq?: number;
}
