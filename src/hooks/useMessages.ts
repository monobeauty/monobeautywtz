import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Message } from "@/types/message";

const PAGE_SIZE = 50;

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [instances, setInstances] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const initialFetchDone = useRef(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (!error && data) {
      // Deduplicate by whatsapp_id (primary) or id (fallback)
      const deduped = new Map<string, Message>();
      (data as Message[]).forEach(m => {
        const key = m.whatsapp_id || m.id;
        if (!deduped.has(key)) deduped.set(key, m);
      });
      const sorted = [...deduped.values()].sort((a, b) => {
        const aSeconds = Math.floor(new Date(a.created_at).getTime() / 1000);
        const bSeconds = Math.floor(new Date(b.created_at).getTime() / 1000);
        if (aSeconds !== bSeconds) return aSeconds - bSeconds;
        if (a.is_from_me !== b.is_from_me) return a.is_from_me ? 1 : -1;
        return a.id.localeCompare(b.id);
      });
      setMessages(sorted);
      const uniqueInstances = [...new Set(sorted.map((m) => m.instance_name))];
      setInstances(uniqueInstances);
      setHasMore(data.length === PAGE_SIZE);
      initialFetchDone.current = true;
    }
    setLoading(false);
  }, []);

  const fetchOlderMessages = useCallback(async (instanceName?: string, contactJid?: string) => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    // Find the oldest message matching the current filters
    let oldestTimestamp: string | null = null;
    for (const msg of messages) {
      if (instanceName && msg.instance_name !== instanceName) continue;
      if (contactJid && msg.remote_jid !== contactJid) continue;
      if (!oldestTimestamp || msg.created_at < oldestTimestamp) {
        oldestTimestamp = msg.created_at;
      }
    }

    let query = supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (oldestTimestamp) {
      query = query.lt("created_at", oldestTimestamp);
    }
    if (instanceName) {
      query = query.eq("instance_name", instanceName);
    }
    if (contactJid) {
      query = query.eq("remote_jid", contactJid);
    }

    const { data, error } = await query;

    if (!error && data) {
      const older = (data as Message[]).sort((a, b) => {
        const aSeconds = Math.floor(new Date(a.created_at).getTime() / 1000);
        const bSeconds = Math.floor(new Date(b.created_at).getTime() / 1000);
        if (aSeconds !== bSeconds) return aSeconds - bSeconds;
        if (a.is_from_me !== b.is_from_me) return a.is_from_me ? 1 : -1;
        return a.id.localeCompare(b.id);
      });
      setMessages((prev) => {
        const existingKeys = new Set(prev.map((m) => m.whatsapp_id || m.id));
        const newMsgs = older.filter((m) => !existingKeys.has(m.whatsapp_id || m.id));
        return [...newMsgs, ...prev];
      });
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  }, [messages, loadingMore, hasMore]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    const handleNewOrUpdated = (payload: any) => {
      const newMsg = payload.new as Message;
      setMessages((prev) => {
        const newKey = newMsg.whatsapp_id || newMsg.id;
        // Skip if duplicate whatsapp_id already exists (for INSERT)
        if (payload.eventType === 'INSERT' && prev.some(m => (m.whatsapp_id || m.id) === newKey)) {
          return prev;
        }
        // Remove existing if updating
        const withoutExisting = prev.filter((m) => (m.whatsapp_id || m.id) !== newKey);
        return [...withoutExisting, newMsg].sort((a, b) => {
          const aSeconds = Math.floor(new Date(a.created_at).getTime() / 1000);
          const bSeconds = Math.floor(new Date(b.created_at).getTime() / 1000);
          if (aSeconds !== bSeconds) return aSeconds - bSeconds;
          if (a.is_from_me !== b.is_from_me) return a.is_from_me ? 1 : -1;
          return a.id.localeCompare(b.id);
        });
      });
      setInstances((prev) =>
        prev.includes(newMsg.instance_name) ? prev : [...prev, newMsg.instance_name]
      );
    };

    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, handleNewOrUpdated)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, handleNewOrUpdated)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) => {
        const oldId = (payload.old as any)?.id;
        if (oldId) {
          setMessages((prev) => prev.filter((m) => m.id !== oldId));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const removeMessages = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setMessages((prev) => prev.filter((m) => !idSet.has(m.id)));
  }, []);

  const removeMessagesByJid = useCallback((jid: string) => {
    setMessages((prev) => prev.filter((m) => m.remote_jid !== jid));
  }, []);

  return { messages, instances, loading, loadingMore, hasMore, fetchOlderMessages, removeMessages, removeMessagesByJid };
}
