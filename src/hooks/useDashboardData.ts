import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval, isWithinInterval } from "date-fns";

interface RawMessage {
  id: string;
  instance_name: string;
  remote_jid: string;
  is_from_me: boolean | null;
  message_text: string | null;
  created_at: string | null;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export function useDashboardData(dateRange?: DateRange) {
  const [messages, setMessages] = useState<RawMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    let all: RawMessage[] = [];
    let from = 0;
    const pageSize = 1000;
    let keepGoing = true;

    while (keepGoing) {
      const { data, error } = await supabase
        .from("messages")
        .select("id, instance_name, remote_jid, is_from_me, message_text, created_at")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error || !data || data.length === 0) {
        keepGoing = false;
      } else {
        all = [...all, ...(data as RawMessage[])];
        from += pageSize;
        if (data.length < pageSize) keepGoing = false;
      }
    }
    setMessages(all);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as RawMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [msg, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter messages by date range
  const filtered = useMemo(() => {
    if (!dateRange?.from) return messages;
    const start = startOfDay(dateRange.from);
    const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
    return messages.filter((m) => {
      if (!m.created_at) return false;
      return isWithinInterval(new Date(m.created_at), { start, end });
    });
  }, [messages, dateRange?.from, dateRange?.to]);

  const volumeByInstance = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((m) => {
      counts[m.instance_name] = (counts[m.instance_name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const funnelOptions = useMemo(() => {
    let duvidas = 0;
    let terceirizacao = 0;
    filtered.forEach((m) => {
      const txt = (m.message_text || "").toLowerCase();
      if (txt.includes("1) dúvidas gerais") || txt.includes("1) duvidas gerais")) duvidas++;
      if (txt.includes("2) dúvidas sobre terceirização") || txt.includes("2) duvidas sobre terceirizacao")) terceirizacao++;
    });
    return [
      { name: "Dúvidas Gerais", value: duvidas },
      { name: "Terceirização", value: terceirizacao },
    ];
  }, [filtered]);

  const messagesPerDay = useMemo(() => {
    const from = dateRange?.from ? startOfDay(dateRange.from) : startOfDay(subDays(new Date(), 6));
    const to = dateRange?.to ? endOfDay(dateRange.to) : endOfDay(new Date());
    const interval = eachDayOfInterval({ start: from, end: to });
    const days = interval.map((d) => ({ date: format(d, "dd/MM"), count: 0 }));

    filtered.forEach((m) => {
      if (!m.created_at) return;
      const key = format(new Date(m.created_at), "dd/MM");
      const entry = days.find((d) => d.date === key);
      if (entry) entry.count++;
    });
    return days;
  }, [filtered, dateRange?.from, dateRange?.to]);

  const todayStart = startOfDay(new Date()).toISOString();

  const newClientsToday = useMemo(() => {
    const jids = new Set<string>();
    // Always use unfiltered for "today" card
    messages.forEach((m) => {
      if (m.created_at && m.created_at >= todayStart) {
        jids.add(m.remote_jid);
      }
    });
    return jids.size;
  }, [messages, todayStart]);

  const transferRate = useMemo(() => {
    const allJids = new Set(filtered.map((m) => m.remote_jid));
    const opt2Jids = new Set<string>();
    filtered.forEach((m) => {
      const txt = (m.message_text || "").toLowerCase();
      if (txt.includes("2) dúvidas sobre terceirização") || txt.includes("2) duvidas sobre terceirizacao")) {
        opt2Jids.add(m.remote_jid);
      }
    });
    if (allJids.size === 0) return 0;
    return Math.round((opt2Jids.size / allJids.size) * 100);
  }, [filtered]);

  const totalMessages = filtered.length;

  const messagesByHour = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, "0")}h`,
      count: 0,
    }));
    filtered.forEach((m) => {
      if (!m.created_at) return;
      const h = new Date(m.created_at).getHours();
      hours[h].count++;
    });
    return hours;
  }, [filtered]);

  return {
    loading,
    volumeByInstance,
    funnelOptions,
    messagesPerDay,
    messagesByHour,
    newClientsToday,
    transferRate,
    totalMessages,
  };
}
