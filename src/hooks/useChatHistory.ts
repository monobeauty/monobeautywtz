import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Message, MediaType } from "@/types/message";

const PAGE_SIZE = 50;

function detectMedia(msg: any): { type: MediaType; url: string | null; mimetype: string | null; filename: string | null; caption: string | null } {
  const m = msg.message || {};

  if (m.imageMessage) {
    return {
      type: "image",
      url: m.imageMessage.url || m.imageMessage.directPath || null,
      mimetype: m.imageMessage.mimetype || "image/jpeg",
      filename: null,
      caption: m.imageMessage.caption || null,
    };
  }
  if (m.videoMessage) {
    return {
      type: "video",
      url: m.videoMessage.url || m.videoMessage.directPath || null,
      mimetype: m.videoMessage.mimetype || "video/mp4",
      filename: null,
      caption: m.videoMessage.caption || null,
    };
  }
  if (m.audioMessage) {
    return {
      type: "audio",
      url: m.audioMessage.url || m.audioMessage.directPath || null,
      mimetype: m.audioMessage.mimetype || "audio/ogg",
      filename: null,
      caption: null,
    };
  }
  if (m.documentMessage) {
    return {
      type: "document",
      url: m.documentMessage.url || m.documentMessage.directPath || null,
      mimetype: m.documentMessage.mimetype || "application/octet-stream",
      filename: m.documentMessage.fileName || m.documentMessage.title || "documento",
      caption: m.documentMessage.caption || null,
    };
  }
  if (m.stickerMessage) {
    return {
      type: "sticker",
      url: m.stickerMessage.url || m.stickerMessage.directPath || null,
      mimetype: m.stickerMessage.mimetype || "image/webp",
      filename: null,
      caption: null,
    };
  }
  return { type: null, url: null, mimetype: null, filename: null, caption: null };
}

function parseMessages(rawMessages: any[], instanceName: string, remoteJid: string): Message[] {
  const parsed: Message[] = [];
  if (!Array.isArray(rawMessages)) return parsed;

  rawMessages.forEach((msg: any, index: number) => {
    const key = msg.key || {};
    const media = detectMedia(msg);

    const msgText =
      media.caption ||
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      null;

    parsed.push({
      id: msg.id || key.id || crypto.randomUUID(),
      _seq: index,
      instance_name: instanceName,
      remote_jid: remoteJid,
      push_name: msg.pushName || null,
      message_text: msgText,
      is_from_me: key.fromMe ?? false,
      created_at: (() => {
        const ts = msg.messageTimestamp;
        if (!ts) return new Date().toISOString();
        if (typeof ts === "number") {
          // If timestamp is in seconds (< year 2100 in seconds), convert to ms
          return new Date(ts < 10000000000 ? ts * 1000 : ts).toISOString();
        }
        // String: could be numeric string (seconds) or ISO string
        const num = Number(ts);
        if (!isNaN(num) && num > 0) {
          return new Date(num < 10000000000 ? num * 1000 : num).toISOString();
        }
        // Try as ISO string
        const d = new Date(ts);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      })(),
      media_type: media.type,
      media_url: media.url,
      media_mimetype: media.mimetype,
      media_filename: media.filename,
    });
  });

  return parsed;
}

export function useChatHistory() {
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const fetchedKey = useRef<string | null>(null);
  const currentOffset = useRef(0);

  const fetchHistory = useCallback(async (instanceName: string, remoteJid: string) => {
    const key = `${instanceName}::${remoteJid}`;
    if (key === fetchedKey.current) return;

    setLoading(true);
    setHistoryMessages([]);
    currentOffset.current = 0;

    try {
      const { data, error } = await supabase.functions.invoke("fetch-history", {
        body: { instance_name: instanceName, remote_jid: remoteJid, count: PAGE_SIZE, offset: 0 },
      });

      if (error) {
        console.error("Error fetching chat history:", error);
        setLoading(false);
        return;
      }

      const rawMessages = data?.messages?.records || data?.messages || data;
      const parsed = parseMessages(rawMessages, instanceName, remoteJid);

      setHistoryMessages(parsed);
      setHasMore(Array.isArray(rawMessages) && rawMessages.length === PAGE_SIZE);
      currentOffset.current = parsed.length;
      fetchedKey.current = key;
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMoreHistory = useCallback(async (instanceName: string, remoteJid: string) => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const { data, error } = await supabase.functions.invoke("fetch-history", {
        body: {
          instance_name: instanceName,
          remote_jid: remoteJid,
          count: PAGE_SIZE,
          offset: currentOffset.current,
        },
      });

      if (error) {
        console.error("Error fetching more history:", error);
        setLoadingMore(false);
        return;
      }

      const rawMessages = data?.messages?.records || data?.messages || data;
      const parsed = parseMessages(rawMessages, instanceName, remoteJid);

      setHistoryMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMsgs = parsed.filter((m) => !existingIds.has(m.id));
        return [...newMsgs, ...prev];
      });
      setHasMore(Array.isArray(rawMessages) && rawMessages.length === PAGE_SIZE);
      currentOffset.current += parsed.length;
    } catch (err) {
      console.error("Failed to fetch more history:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore]);

  const clearHistory = useCallback(() => {
    setHistoryMessages([]);
    fetchedKey.current = null;
    currentOffset.current = 0;
    setHasMore(true);
  }, []);

  return { historyMessages, loading, loadingMore, hasMore, fetchHistory, fetchMoreHistory, clearHistory };
}
