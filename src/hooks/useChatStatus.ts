import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StatusAtendimento = "pendente" | "em_atendimento" | "finalizado" | "no_record" | null;

interface ChatStatus {
  remote_jid: string;
  status: "open" | "closed";
  instance_name: string;
  operador_nome: string | null;
  status_atendimento: string | null;
}

export function useChatStatus() {
  const [statuses, setStatuses] = useState<Map<string, ChatStatus>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchStatuses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("chat_status")
      .select("remote_jid, status, instance_name, operador_nome, status_atendimento");

    if (!error && data) {
      const map = new Map<string, ChatStatus>();
      data.forEach((row: any) => {
        map.set(row.remote_jid, {
          remote_jid: row.remote_jid,
          status: row.status,
          instance_name: row.instance_name,
          operador_nome: row.operador_nome || null,
          status_atendimento: row.status_atendimento || null,
        });
      });
      setStatuses(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // Real-time subscription for status changes
  useEffect(() => {
    const channel = supabase
      .channel("chat-status-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_status" },
        (payload) => {
          console.log("[chat_status REALTIME]", payload.eventType, payload.new, payload.old);
          if (payload.eventType === "DELETE") {
            const old = payload.old as any;
            setStatuses((prev) => {
              const next = new Map(prev);
              next.delete(old.remote_jid);
              return next;
            });
          } else {
            const row = payload.new as any;
            setStatuses((prev) => {
              const next = new Map(prev);
              next.set(row.remote_jid, {
                remote_jid: row.remote_jid,
                status: row.status,
                instance_name: row.instance_name,
                operador_nome: row.operador_nome || null,
                status_atendimento: row.status_atendimento || null,
              });
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const closeChat = useCallback(async (remoteJid: string, instanceName: string) => {
    const { error } = await supabase
      .from("chat_status")
      .upsert(
        {
          remote_jid: remoteJid,
          instance_name: instanceName,
          status: "closed",
          closed_at: new Date().toISOString(),
          status_atendimento: "finalizado",
        },
        { onConflict: "remote_jid" }
      );
    return { error };
  }, []);

  const reopenChat = useCallback(async (remoteJid: string) => {
    const { error } = await supabase
      .from("chat_status")
      .update({ status: "open", closed_at: null, status_atendimento: "pendente", operador_nome: null, operador_id: null })
      .eq("remote_jid", remoteJid);
    return { error };
  }, []);

  const assumirAtendimento = useCallback(async (remoteJid: string, instanceName: string, operadorNome: string, operadorId?: string) => {
    const { error } = await supabase
      .from("chat_status")
      .upsert(
        {
          remote_jid: remoteJid,
          instance_name: instanceName,
          status: "open",
          status_atendimento: "em_atendimento",
          operador_nome: operadorNome,
          operador_id: operadorId || null,
        } as any,
        { onConflict: "remote_jid" }
      );
    return { error };
  }, []);

  const reabrirAtendimento = useCallback(async (remoteJid: string, instanceName: string) => {
    const { error } = await supabase
      .from("chat_status")
      .upsert(
        {
          remote_jid: remoteJid,
          instance_name: instanceName,
          status: "open",
          status_atendimento: "pendente",
          closed_at: null,
          operador_nome: null,
          operador_id: null,
        } as any,
        { onConflict: "remote_jid" }
      );
    return { error };
  }, []);

  const getStatus = useCallback(
    (remoteJid: string): "open" | "closed" => {
      return statuses.get(remoteJid)?.status || "open";
    },
    [statuses]
  );

  const getOperadorNome = useCallback(
    (remoteJid: string): string | null => {
      return statuses.get(remoteJid)?.operador_nome || null;
    },
    [statuses]
  );

  const getStatusAtendimento = useCallback(
    (remoteJid: string): StatusAtendimento => {
      const entry = statuses.get(remoteJid);
      if (!entry) return "no_record";
      const sa = entry.status_atendimento;
      if (sa === "pendente" || sa === "em_atendimento") return sa;
      if (sa === "finalizado") return "finalizado";
      return null;
    },
    [statuses]
  );

  const getInstanceName = useCallback(
    (remoteJid: string): string | null => {
      return statuses.get(remoteJid)?.instance_name || null;
    },
    [statuses]
  );

  return { statuses, loading, closeChat, reopenChat, assumirAtendimento, reabrirAtendimento, getStatus, getOperadorNome, getStatusAtendimento, getInstanceName };
}
