import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StatusAtendimento = "pendente" | "em_atendimento";

export function useBotMemoria() {
  const [records, setRecords] = useState<Map<string, StatusAtendimento>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchMemoria = useCallback(async () => {
    const { data, error } = await supabase
      .from("bot_memoria")
      .select("telefone, status_atendimento");

    if (!error && data) {
      const map = new Map<string, StatusAtendimento>();
      data.forEach((r: any) => {
        map.set(r.telefone, (r.status_atendimento || "pendente") as StatusAtendimento);
      });
      setRecords(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMemoria();

    const channel = supabase
      .channel("bot_memoria_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bot_memoria" },
        (payload) => {
          console.log("[bot_memoria REALTIME]", payload.eventType, payload.new, payload.old);
          if (payload.eventType === "INSERT") {
            const row = payload.new as any;
            if (row.telefone) {
              setRecords((prev) => {
                const next = new Map(prev);
                next.set(row.telefone, (row.status_atendimento || "pendente") as StatusAtendimento);
                return next;
              });
            }
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as any;
            if (row.telefone) {
              setRecords((prev) => {
                const next = new Map(prev);
                next.delete(row.telefone);
                return next;
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as any;
            if (row.telefone) {
              setRecords((prev) => {
                const next = new Map(prev);
                next.set(row.telefone, (row.status_atendimento || "pendente") as StatusAtendimento);
                return next;
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMemoria]);

  const isInBotMemoria = useCallback(
    (jid: string): boolean => {
      const phone = jid.replace(/@.*/, "");
      return records.has(phone);
    },
    [records]
  );

  const getStatusAtendimento = useCallback(
    (jid: string): StatusAtendimento | null => {
      const phone = jid.replace(/@.*/, "");
      return records.get(phone) ?? null;
    },
    [records]
  );

  const assumirAtendimento = useCallback(async (jid: string, instanceName: string, operadorNome: string, operadorId?: string) => {
    const phone = jid.replace(/@.*/, "");
    // Update bot_memoria status
    const { error } = await supabase
      .from("bot_memoria")
      .update({ status_atendimento: "em_atendimento" } as any)
      .eq("telefone", phone);
    
    // Also upsert chat_status with operator info
    if (!error) {
      await supabase
        .from("chat_status")
        .upsert(
          {
            remote_jid: jid,
            instance_name: instanceName,
            status: "open",
            operador_nome: operadorNome,
            operador_id: operadorId || null,
          } as any,
          { onConflict: "remote_jid" }
        );
    }
    
    return { error };
  }, []);

  const reabrirAtendimento = useCallback(async (jid: string, instanceName: string) => {
    const phone = jid.replace(/@.*/, "");
    // Insert/upsert into bot_memoria with status pendente
    const { error: memError } = await supabase
      .from("bot_memoria")
      .upsert(
        { telefone: phone, status_atendimento: "pendente" } as any,
        { onConflict: "telefone" }
      );

    if (memError) return { error: memError };

    // Upsert chat_status to open, clearing operator
    const { error: chatError } = await supabase
      .from("chat_status")
      .upsert(
        {
          remote_jid: jid,
          instance_name: instanceName,
          status: "open",
          closed_at: null,
          operador_nome: null,
          operador_id: null,
        } as any,
        { onConflict: "remote_jid" }
      );

    return { error: chatError };
  }, []);

  return { isInBotMemoria, getStatusAtendimento, assumirAtendimento, reabrirAtendimento, loading, records };
}
