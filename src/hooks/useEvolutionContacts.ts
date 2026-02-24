import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EvolutionContact {
  jid: string;
  originalJid: string;
  pushName: string;
  lastMessageTimestamp: string | null;
  lastMessage: string | null;
  profilePicUrl: string | null;
  unreadCount: number;
}

export function useEvolutionContacts() {
  const [contacts, setContacts] = useState<EvolutionContact[]>([]);
  const [loading, setLoading] = useState(false);
  const deletedJids = useRef(new Set<string>());

  const fetchContacts = useCallback(async (instanceName: string) => {
    setLoading(true);
    setContacts([]);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-contacts", {
        body: { instance_name: instanceName },
      });

      if (error) {
        console.error("Error fetching Evolution contacts:", error);
        setLoading(false);
        return;
      }

      // Evolution API returns an array of chat objects
      const parsed: EvolutionContact[] = [];
      if (Array.isArray(data)) {
        data.forEach((chat: any) => {
          const rawJid = chat.remoteJid || chat.id || chat.jid;
          if (!rawJid || rawJid.endsWith("@g.us") || rawJid === "status@broadcast") return;

          // Normalize: prefer remoteJidAlt (@s.whatsapp.net) over @lid format
          const altJid = chat.lastMessage?.key?.remoteJidAlt;
          const jid = (rawJid.endsWith("@lid") && altJid) ? altJid : rawJid;
          
          const msgTs = chat.lastMessage?.messageTimestamp || chat.updatedAt;
          parsed.push({
            jid,
            originalJid: rawJid,
            pushName: chat.pushName || chat.name || chat.lastMessage?.pushName || jid.replace(/@.*/, ""),
            profilePicUrl: chat.profilePicUrl || null,
            unreadCount: chat.unreadCount || 0,
            lastMessageTimestamp: msgTs
              ? new Date(typeof msgTs === "number" ? msgTs * 1000 : msgTs).toISOString()
              : null,
            lastMessage: chat.lastMessage?.message?.conversation ||
              chat.lastMessage?.message?.extendedTextMessage?.text ||
              null,
          });
        });
      }

      const filtered = parsed.filter(c => !deletedJids.current.has(c.jid));
      setContacts(filtered);
    } catch (err) {
      console.error("Failed to fetch Evolution contacts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeContact = useCallback((jid: string) => {
    deletedJids.current.add(jid);
    setContacts((prev) => prev.filter((c) => c.jid !== jid));
  }, []);

  const clearDeletedJid = useCallback((jid: string) => {
    deletedJids.current.delete(jid);
  }, []);

  return { contacts, loading, fetchContacts, removeContact, clearDeletedJid };
}
