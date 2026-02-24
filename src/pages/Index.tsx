import { useState, useMemo, useEffect, useCallback } from "react";
import { useMessages } from "@/hooks/useMessages";
import { useEvolutionContacts } from "@/hooks/useEvolutionContacts";
import { useEvolutionInstances } from "@/hooks/useEvolutionInstances";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useChatStatus } from "@/hooks/useChatStatus";
import { useUserProfile } from "@/hooks/useUserProfile";
import { InstanceSidebar } from "@/components/InstanceSidebar";
import { ContactSidebar } from "@/components/ContactSidebar";
import { ChatPanel } from "@/components/ChatPanel";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatFilters } from "@/components/ChatFilters";
import { MessageInput } from "@/components/MessageInput";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { messages, instances: dbInstances, loading, loadingMore: dbLoadingMore, hasMore: dbHasMore, fetchOlderMessages, removeMessages, removeMessagesByJid } = useMessages();
  const { contacts: evolutionContacts, loading: evolutionLoading, fetchContacts, removeContact, clearDeletedJid } = useEvolutionContacts();
  const { instances: evolutionInstances, statusMap: instanceStatusMap, profilePicMap: instanceProfilePics } = useEvolutionInstances();
  const { closeChat, reopenChat, getStatus, getOperadorNome, getStatusAtendimento, assumirAtendimento, reabrirAtendimento, getInstanceName } = useChatStatus();
  const { allowedInstances, isAdmin, profile } = useUserProfile();

  // Merge instances from Evolution API + DB (Evolution is primary source)
  const allInstances = useMemo(() => {
    const set = new Set([...evolutionInstances, ...dbInstances]);
    return [...set];
  }, [evolutionInstances, dbInstances]);
  
  // Filter instances based on user permissions (empty = all allowed)
  const filteredInstances = useMemo(() => {
    if (!allowedInstances || allowedInstances.length === 0) return allInstances;
    return allInstances.filter((i) => allowedInstances.includes(i));
  }, [allInstances, allowedInstances]);
  const {
    historyMessages,
    loading: historyLoading,
    loadingMore: historyLoadingMore,
    hasMore: historyHasMore,
    fetchHistory,
    fetchMoreHistory,
    clearHistory,
  } = useChatHistory();
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);

  // Auto-select when there's only one instance
  useEffect(() => {
    if (filteredInstances.length === 1 && selectedInstance !== filteredInstances[0]) {
      setSelectedInstance(filteredInstances[0]);
    }
  }, [filteredInstances, selectedInstance]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [readContacts, setReadContacts] = useState<Set<string>>(new Set());

  const handleMarkRead = useCallback((jid: string) => {
    setReadContacts(prev => {
      const next = new Set(prev);
      next.add(jid);
      return next;
    });
  }, []);

  // Fetch Evolution contacts when instance is selected
  useEffect(() => {
    if (selectedInstance) {
      fetchContacts(selectedInstance);
    }
  }, [selectedInstance, fetchContacts]);

  // Listen for incoming messages and clear deletedJids so contacts reappear
  useEffect(() => {
    const channel = supabase
      .channel("incoming-msg-clear-deleted")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as any;
          if (msg.is_from_me === false && msg.remote_jid) {
            clearDeletedJid(msg.remote_jid);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clearDeletedJid]);

  // Map each contact to their latest instance and all previous instances
  const contactLatestInstance = useMemo(() => {
    const map = new Map<string, { instance: string; time: number }>();
    messages.forEach((m) => {
      const t = new Date(m.created_at).getTime();
      const existing = map.get(m.remote_jid);
      if (!existing || t > existing.time) {
        map.set(m.remote_jid, { instance: m.instance_name, time: t });
      }
    });
    return map;
  }, [messages]);

  // Detect contacts transferred from another instance
  const transferredContacts = useMemo(() => {
    const map = new Map<string, string>(); // jid -> previous instance
    const allInstances = new Map<string, Set<string>>(); // jid -> set of all instances
    messages.forEach((m) => {
      if (!allInstances.has(m.remote_jid)) allInstances.set(m.remote_jid, new Set());
      allInstances.get(m.remote_jid)!.add(m.instance_name);
    });
    allInstances.forEach((instanceSet, jid) => {
      if (instanceSet.size > 1) {
        const latest = contactLatestInstance.get(jid);
        if (latest) {
          // Find the second-most-recent instance
          let prevInstance = "";
          let prevTime = 0;
          messages.forEach((m) => {
            if (m.remote_jid === jid && m.instance_name !== latest.instance) {
              const t = new Date(m.created_at).getTime();
              if (t > prevTime) {
                prevTime = t;
                prevInstance = m.instance_name;
              }
            }
          });
          if (prevInstance) map.set(jid, prevInstance);
        }
      }
    });
    return map;
  }, [messages, contactLatestInstance]);

  const messageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    // Count contacts (not messages) per instance based on latest instance ownership
    contactLatestInstance.forEach(({ instance }) => {
      counts[instance] = (counts[instance] || 0) + 1;
    });
    return counts;
  }, [contactLatestInstance]);

  const instanceMessages = useMemo(() => {
    // Use chat_status.instance_name as authoritative source, fallback to message-based instance
    const getEffectiveInstance = (jid: string) => {
      return getInstanceName(jid) || contactLatestInstance.get(jid)?.instance || null;
    };

    const allowed = allowedInstances.length > 0 ? allowedInstances : null;
    const base = allowed
      ? messages.filter((m) => {
          const inst = getEffectiveInstance(m.remote_jid);
          return inst && allowed.includes(inst);
        })
      : messages;
    
    if (!selectedInstance) return base;
    return base.filter((m) => {
      const inst = getEffectiveInstance(m.remote_jid);
      return inst === selectedInstance;
    });
  }, [messages, selectedInstance, contactLatestInstance, allowedInstances, getInstanceName]);

  // Always fetch history from Evolution when selecting a contact
  useEffect(() => {
    if (selectedInstance && selectedContact) {
      const ec = evolutionContacts.find((c) => c.jid === selectedContact);
      const queryJid = ec?.originalJid || selectedContact;
      fetchHistory(selectedInstance, queryJid);
    }
  }, [selectedInstance, selectedContact, fetchHistory, evolutionContacts]);

  // Clear history when deselecting contact
  useEffect(() => {
    if (!selectedContact) {
      clearHistory();
    }
  }, [selectedContact, clearHistory]);

  const filteredMessages = useMemo(() => {
    let filtered = instanceMessages;

    if (selectedContact) {
      // When viewing a specific contact, load ALL messages for this remote_jid
      // regardless of instance_name, so transferred contacts show full history
      const allDbMessages = messages.filter((m) => m.remote_jid === selectedContact);

      // Use historyMessages (Evolution API) as primary source — preserves WhatsApp order via _seq
      const base = [...historyMessages];

      // Add DB-only messages that don't exist in history (10s tolerance window)
      allDbMessages.forEach(dbMsg => {
        const isDuplicate = base.some(hm => {
          if (hm.is_from_me !== dbMsg.is_from_me) return false;
          const textA = (hm.message_text || '').trim().slice(0, 50);
          const textB = (dbMsg.message_text || '').trim().slice(0, 50);
          if (textA !== textB) return false;
          const timeDiff = Math.abs(
            new Date(hm.created_at).getTime() - new Date(dbMsg.created_at).getTime()
          );
          return timeDiff < 10000;
        });
        if (!isDuplicate) {
          base.push(dbMsg);
        }
      });

      // Stable sort: messages with _seq keep their relative order;
      // messages without _seq are interleaved by timestamp
      const withSeq = base.filter(m => m._seq !== undefined).sort((a, b) => a._seq! - b._seq!);
      const withoutSeq = base.filter(m => m._seq === undefined).sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Interleave: insert DB-only messages into the seq-ordered list by timestamp
      const result: typeof base = [];
      let dbIdx = 0;
      for (const seqMsg of withSeq) {
        const seqTime = new Date(seqMsg.created_at).getTime();
        while (dbIdx < withoutSeq.length && new Date(withoutSeq[dbIdx].created_at).getTime() <= seqTime) {
          result.push(withoutSeq[dbIdx++]);
        }
        result.push(seqMsg);
      }
      // Append remaining DB-only messages
      while (dbIdx < withoutSeq.length) {
        result.push(withoutSeq[dbIdx++]);
      }

      filtered = result;
    }

    // Search no longer filters out messages — highlighting is handled in ChatPanel

    if (dateRange.from) {
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      filtered = filtered.filter((m) =>
        isWithinInterval(new Date(m.created_at), { start: from, end: to })
      );
    }

    return filtered;
  }, [instanceMessages, selectedContact, dateRange, historyMessages, messages]);

  // Compute search matches from filteredMessages
  const searchMatchIds = useMemo(() => {
    if (!search.trim()) return [] as string[];
    const q = search.toLowerCase();
    return filteredMessages
      .filter(m => m.message_text?.toLowerCase().includes(q))
      .map(m => m.whatsapp_id || m.id);
  }, [search, filteredMessages]);

  // Reset index when search changes
  useEffect(() => {
    setCurrentSearchIndex(0);
  }, [search]);

  const scrollToSearchMatch = useCallback((id: string) => {
    const el = document.querySelector(`[data-msg-id="${id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const handleSearchNavigate = useCallback((direction: "prev" | "next") => {
    if (searchMatchIds.length === 0) return;
    setCurrentSearchIndex(prev => {
      const next = direction === "next"
        ? (prev + 1) % searchMatchIds.length
        : (prev - 1 + searchMatchIds.length) % searchMatchIds.length;
      scrollToSearchMatch(searchMatchIds[next]);
      return next;
    });
  }, [searchMatchIds, scrollToSearchMatch]);

  const handleLoadMore = useCallback(() => {
    if (selectedInstance && selectedContact) {
      const ec = evolutionContacts.find((c) => c.jid === selectedContact);
      const queryJid = ec?.originalJid || selectedContact;
      fetchMoreHistory(selectedInstance, queryJid);
    } else {
      fetchOlderMessages(selectedInstance || undefined);
    }
  }, [selectedInstance, selectedContact, evolutionContacts, fetchMoreHistory, fetchOlderMessages]);

  const currentLoadingMore = selectedContact ? historyLoadingMore : dbLoadingMore;
  const currentHasMore = selectedContact ? historyHasMore : dbHasMore;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      <div
        className={`
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          fixed inset-y-0 left-0 z-40 w-80 transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0
        `}
      >
        <InstanceSidebar
          instances={filteredInstances}
          selected={selectedInstance}
          onSelect={(instance) => {
            setSelectedInstance(instance);
            setSelectedContact(null);
            setReadContacts(new Set());
            setSidebarOpen(false);
          }}
          messageCounts={messageCounts}
          instanceStatusMap={instanceStatusMap}
          instanceProfilePics={instanceProfilePics}
        />
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {selectedInstance && (
        <div className="hidden md:flex w-[450px] flex-col border-r border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Contatos</h2>
            <p className="text-xs text-muted-foreground">{selectedInstance}</p>
          </div>
          <ContactSidebar
            messages={instanceMessages}
            selectedContact={selectedContact}
            onSelectContact={setSelectedContact}
            evolutionContacts={evolutionContacts}
            evolutionLoading={evolutionLoading}
            transferredContacts={transferredContacts}
            getStatus={getStatus}
            getStatusAtendimento={getStatusAtendimento}
            getOperadorNome={getOperadorNome}
            getInstanceName={getInstanceName}
            getMessageInstance={(jid: string) => contactLatestInstance.get(jid)?.instance || null}
            selectedInstance={selectedInstance}
            readContacts={readContacts}
            onMarkRead={handleMarkRead}
            onReopenChat={async (jid) => {
              const { error } = await reopenChat(jid);
              if (error) {
                toast.error("Erro ao reabrir atendimento");
              } else {
                toast.success("Atendimento reaberto com sucesso");
              }
            }}
          />
        </div>
      )}

      {selectedInstance ? (
        <div className="flex-1 flex flex-col min-w-0">
          <ChatFilters
            search={search}
            onSearchChange={setSearch}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            selectedInstance={selectedInstance}
            selectedContactJid={selectedContact}
            onFinishAttendance={() => setSelectedContact(null)}
            contactStatus={selectedContact ? getStatusAtendimento(selectedContact) : null}
            operadorNome={selectedContact ? getOperadorNome(selectedContact) : null}
            onReopenChat={async (jid) => {
              const { error } = await reabrirAtendimento(jid, selectedInstance!);
              if (error) throw error;
            }}
            onAssumir={async (jid) => {
              const operadorNome = profile?.nome || profile?.email?.split("@")[0] || "Operador";
              const { error } = await assumirAtendimento(jid, selectedInstance!, operadorNome, profile?.user_id);
              if (error) {
                toast.error("Erro ao assumir atendimento");
              }
            }}
            onCloseChat={async (jid) => {
              if (selectedInstance) await closeChat(jid, selectedInstance);
            }}
            onDeleteConversation={async (jid) => {
              try {
                const phone = jid.replace(/@.*/, "");

                // Delete messages
                const { error } = await supabase
                  .from("messages")
                  .delete()
                  .eq("remote_jid", jid);
                if (error) throw error;

                // Clean bot_memoria
                await supabase
                  .from("bot_memoria")
                  .delete()
                  .eq("telefone", phone);

                // Clean chat_status
                await supabase
                  .from("chat_status")
                  .delete()
                  .eq("remote_jid", jid);

                removeMessagesByJid(jid);
                removeContact(jid);
                clearHistory();
                toast.success("Conversa apagada com sucesso");
                setSelectedContact(null);
              } catch (err) {
                console.error("Erro ao apagar conversa:", err);
                toast.error("Erro ao apagar conversa");
              }
            }}
            selectedContactName={(() => {
              if (!selectedContact) return null;
              // Priority 1: Last INCOMING message from DB (most reliable for contact name)
              const incomingMsg = [...instanceMessages]
                .filter((m) => m.remote_jid === selectedContact && !m.is_from_me && m.push_name)
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
              if (incomingMsg?.push_name) return incomingMsg.push_name;
              // Priority 2: Last INCOMING from history messages
              const historyIncoming = [...historyMessages]
                .filter((m) => m.remote_jid === selectedContact && !m.is_from_me && m.push_name)
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
              if (historyIncoming?.push_name) return historyIncoming.push_name;
              // Priority 3: Evolution contact (but NOT if it looks like instance name)
              const ec = evolutionContacts.find((c) => c.jid === selectedContact);
              if (ec?.pushName && !allInstances.includes(ec.pushName)) return ec.pushName;
              // Fallback: phone number
              return selectedContact.replace(/@.*/, "");
            })()}
            searchMatchCount={searchMatchIds.length}
            currentSearchIndex={currentSearchIndex}
            onSearchNavigate={handleSearchNavigate}
            selectedContactProfilePic={(() => {
              if (!selectedContact) return null;
              const ec = evolutionContacts.find((c) => c.jid === selectedContact);
              return ec?.profilePicUrl || null;
            })()}
          />

          {!selectedContact ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <span className="text-sm">Selecione um contato na lista para ver a conversa</span>
              </div>
            </div>
          ) : loading || historyLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Carregando mensagens...</span>
              </div>
            </div>
          ) : (
            <ChatPanel
              messages={filteredMessages}
              selectedInstance={selectedInstance}
              selectedContact={selectedContact}
              onLoadMore={handleLoadMore}
              loadingMore={currentLoadingMore}
              hasMore={currentHasMore}
              searchQuery={search}
              onDeleteMessages={async (ids) => {
                try {
                  const { error } = await supabase
                    .from("messages")
                    .delete()
                    .in("id", ids);
                  if (error) throw error;
                  removeMessages(ids);
                  toast.success(`${ids.length} mensagem${ids.length !== 1 ? "ns apagadas" : " apagada"}`);
                } catch (err) {
                  console.error("Erro ao apagar mensagens:", err);
                  toast.error("Erro ao apagar mensagens");
                }
              }}
            />
          )}

          {selectedInstance && selectedContact && (() => {
            const statusAtend = getStatusAtendimento(selectedContact);
            const chatInstance = getInstanceName(selectedContact);
            const instanceMismatch = chatInstance && chatInstance !== selectedInstance;

            if (instanceMismatch) {
              return (
                <div className="px-6 py-4 border-t border-border bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground">
                    Este contato pertence à instância <strong>{chatInstance}</strong>
                  </p>
                </div>
              );
            }

            if (statusAtend === "finalizado" || statusAtend === null) {
              return (
                <div className="px-6 py-4 border-t border-border bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground">
                    Atendimento finalizado — Reabra para enviar mensagens
                  </p>
                </div>
              );
            }

            return <MessageInput instanceName={selectedInstance} remoteJid={selectedContact} />;
          })()}
        </div>
      ) : (
        <WelcomeScreen />
      )}
    </div>
  );
};

export default Index;
