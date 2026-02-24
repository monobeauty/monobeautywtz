import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { User, Loader2, Search, ArrowRightLeft, Bot, CheckCircle2, RotateCcw, Headphones } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import type { Message } from "@/types/message";
import type { EvolutionContact } from "@/hooks/useEvolutionContacts";
import type { StatusAtendimento } from "@/hooks/useChatStatus";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const CONTACTS_PAGE_SIZE = 30;

interface ContactSidebarProps {
  messages: Message[];
  selectedContact: string | null;
  onSelectContact: (jid: string | null) => void;
  evolutionContacts?: EvolutionContact[];
  evolutionLoading?: boolean;
  transferredContacts?: Map<string, string>;
  getStatus?: (remoteJid: string) => "open" | "closed";
  onReopenChat?: (remoteJid: string) => Promise<void>;
  getStatusAtendimento?: (jid: string) => StatusAtendimento;
  getOperadorNome?: (jid: string) => string | null;
  getInstanceName?: (jid: string) => string | null;
  getMessageInstance?: (jid: string) => string | null;
  selectedInstance?: string | null;
  readContacts?: Set<string>;
  onMarkRead?: (jid: string) => void;
}

interface MergedContact {
  jid: string;
  pushName: string;
  lastMessage: string;
  lastTimestamp: string;
  count: number;
  profilePicUrl: string | null;
  unreadCount: number;
}

function ContactSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  );
}

export function ContactSidebar({
  messages,
  selectedContact,
  onSelectContact,
  evolutionContacts = [],
  evolutionLoading = false,
  transferredContacts = new Map(),
  getStatus: _getStatus,
  onReopenChat,
  getStatusAtendimento,
  getOperadorNome,
  getInstanceName,
  getMessageInstance,
  selectedInstance,
  readContacts = new Set(),
  onMarkRead,
}: ContactSidebarProps) {
  const [visibleCount, setVisibleCount] = useState(CONTACTS_PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<"pendente" | "em_atendimento" | "closed">("em_atendimento");
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const contacts = useMemo(() => {
    const map = new Map<string, MergedContact>();

    messages.forEach((msg) => {
      const existing = map.get(msg.remote_jid);
      if (!existing || new Date(msg.created_at) > new Date(existing.lastTimestamp)) {
        map.set(msg.remote_jid, {
          jid: msg.remote_jid,
          pushName: (!msg.is_from_me && msg.push_name) ? msg.push_name : (existing?.pushName || msg.remote_jid.replace(/@.*/, "")),
          lastMessage: msg.message_text || "[mídia]",
          lastTimestamp: msg.created_at,
          count: (existing?.count || 0) + 1,
          profilePicUrl: null,
          unreadCount: 0,
        });
      } else {
        existing.count++;
        if (!msg.is_from_me && msg.push_name) {
          existing.pushName = msg.push_name;
        }
      }
    });

    evolutionContacts.forEach((ec) => {
      if (!map.has(ec.jid)) {
        map.set(ec.jid, {
          jid: ec.jid,
          pushName: ec.pushName || ec.jid.replace(/@.*/, ""),
          lastMessage: ec.lastMessage || "",
          lastTimestamp: ec.lastMessageTimestamp || new Date(0).toISOString(),
          count: 0,
          profilePicUrl: ec.profilePicUrl || null,
          unreadCount: ec.unreadCount || 0,
        });
        return;
      }
      const existing = map.get(ec.jid)!;
      if (!existing.profilePicUrl && ec.profilePicUrl) {
        existing.profilePicUrl = ec.profilePicUrl;
      }
      if (ec.unreadCount > 0) {
        existing.unreadCount = ec.unreadCount;
      }
      const jidClean = ec.jid.replace(/@.*/, "");
      if (existing.pushName === jidClean && ec.pushName !== jidClean) {
        existing.pushName = ec.pushName;
      }
      if (ec.lastMessageTimestamp) {
        const ecTime = new Date(ec.lastMessageTimestamp).getTime();
        const existingTime = new Date(existing.lastTimestamp).getTime();
        if (ecTime > existingTime) {
          existing.lastTimestamp = ec.lastMessageTimestamp;
          if (ec.lastMessage) {
            existing.lastMessage = ec.lastMessage;
          }
        }
      }
    });

    return [...map.values()].sort(
      (a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
    );
  }, [messages, evolutionContacts]);

  const [contactSearch, setContactSearch] = useState("");

  const filteredContacts = useMemo(() => {
    let filtered = contacts;

    if (getStatusAtendimento) {
      filtered = filtered.filter((c) => {
        const status = getStatusAtendimento(c.jid);
        const instanceName = getInstanceName?.(c.jid);

        // Strict instance filter: use chat_status instance, fallback to message-based instance
        const effectiveInstance = instanceName || getMessageInstance?.(c.jid) || null;
        if (selectedInstance && effectiveInstance && effectiveInstance !== selectedInstance) return false;
        // If no effective instance and we have a selected instance, hide the contact
        if (selectedInstance && !effectiveInstance) return false;

        if (activeTab === "closed") {
          if (status !== "finalizado") return false;
          return true;
        }

        if (activeTab === "pendente") {
          if (status !== "pendente" && status !== "no_record") return false;
          return true;
        }

        // Atendendo
        if (status !== activeTab) return false;
        return true;
      });
    }

    if (contactSearch.trim()) {
      const q = contactSearch.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.pushName.toLowerCase().includes(q) ||
          c.jid.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [contacts, contactSearch, getStatusAtendimento, getInstanceName, getMessageInstance, selectedInstance, activeTab]);

  // Helper: check if contact belongs to current instance
  const isContactInCurrentInstance = useCallback((jid: string) => {
    const instanceName = getInstanceName?.(jid);
    const effectiveInstance = instanceName || getMessageInstance?.(jid) || null;
    if (selectedInstance && effectiveInstance && effectiveInstance !== selectedInstance) return false;
    if (selectedInstance && !effectiveInstance) return false;
    return true;
  }, [getInstanceName, getMessageInstance, selectedInstance]);

  // Unread counts per tab: only contacts with unreadCount > 0 AND not marked as read AND in current instance
  const pendentesUnread = useMemo(() => {
    if (!getStatusAtendimento) return 0;
    return contacts.filter((c) => {
      const s = getStatusAtendimento(c.jid);
      return (s === "pendente" || s === "no_record") && c.unreadCount > 0 && !readContacts.has(c.jid) && isContactInCurrentInstance(c.jid);
    }).length;
  }, [contacts, getStatusAtendimento, readContacts, isContactInCurrentInstance]);

  const emAtendimentoUnread = useMemo(() => {
    if (!getStatusAtendimento) return 0;
    return contacts.filter((c) => 
      getStatusAtendimento(c.jid) === "em_atendimento" && c.unreadCount > 0 && !readContacts.has(c.jid) && isContactInCurrentInstance(c.jid)
    ).length;
  }, [contacts, getStatusAtendimento, readContacts, isContactInCurrentInstance]);

  const finalizadosUnread = useMemo(() => {
    if (!getStatusAtendimento) return 0;
    return contacts.filter((c) => 
      getStatusAtendimento(c.jid) === "finalizado" && c.unreadCount > 0 && !readContacts.has(c.jid) && isContactInCurrentInstance(c.jid)
    ).length;
  }, [contacts, getStatusAtendimento, readContacts]);

  useEffect(() => {
    setVisibleCount(CONTACTS_PAGE_SIZE);
  }, [contactSearch, contacts.length, activeTab]);

  const hasMoreContacts = visibleCount < filteredContacts.length;
  const visibleContacts = filteredContacts.slice(0, visibleCount);

  const loadMore = useCallback(() => {
    if (!hasMoreContacts || loadingMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + CONTACTS_PAGE_SIZE, filteredContacts.length));
      setLoadingMore(false);
    }, 300);
  }, [hasMoreContacts, loadingMore, filteredContacts.length]);

  useEffect(() => {
    if (!hasMoreContacts || loadingMore) return;
    const sentinel = bottomSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreContacts, loadingMore, loadMore]);

  return (
    <>
      {/* 3 Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("em_atendimento")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors border-b-2",
            activeTab === "em_atendimento"
              ? "border-blue-500 text-blue-500"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Headphones className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Atendendo</span>
          {emAtendimentoUnread > 0 && (
            <span className="text-xs bg-blue-500 text-white min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full font-bold">
              {emAtendimentoUnread}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("pendente")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors border-b-2",
            activeTab === "pendente"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Bot className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Pendentes</span>
          {pendentesUnread > 0 && (
            <span className="text-xs bg-primary text-primary-foreground min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full font-bold">
              {pendentesUnread}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("closed")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors border-b-2",
            activeTab === "closed"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Finalizados</span>
          {finalizadosUnread > 0 && (
            <span className="text-xs bg-muted-foreground/20 text-muted-foreground min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full font-bold">
              {finalizadosUnread}
            </span>
          )}
        </button>
      </div>

      <div className="px-2 pt-2 pb-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contato..."
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
            className="pl-9 h-8 text-sm bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1 px-1">
          Mostrando {Math.min(visibleCount, filteredContacts.length)} de {filteredContacts.length}
        </p>
      </div>
      <ScrollArea className="flex-1 scrollbar-thin" ref={scrollAreaRef}>
        <div className="space-y-0.5 p-2">
          {activeTab !== "closed" && (
            <button
              onClick={() => onSelectContact(null)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                selectedContact === null
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <User className="w-4 h-4" />
              <span>Todos os contatos</span>
            </button>
          )}

          {evolutionLoading && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Carregando conversas...</span>
            </div>
          )}

          {visibleContacts.length === 0 && !evolutionLoading && (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              {activeTab === "closed" 
                ? "Nenhum atendimento finalizado" 
                : activeTab === "em_atendimento"
                ? "Nenhum contato em atendimento"
                : "Nenhum contato pendente"}
            </div>
          )}

          {visibleContacts.map((contact) => (
            <div key={contact.jid} className="relative group">
              <button
                onClick={() => {
                  onSelectContact(contact.jid);
                  if (contact.unreadCount > 0 && onMarkRead) {
                    onMarkRead(contact.jid);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors text-left",
                  selectedContact === contact.jid
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {contact.profilePicUrl ? (
                  <img
                    src={contact.profilePicUrl}
                    alt={contact.pushName}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <div className={cn(
                  "w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0",
                  contact.profilePicUrl ? "hidden" : ""
                )}>
                  <span className="text-xs font-semibold text-primary">
                    {contact.pushName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{contact.pushName}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {contact.unreadCount > 0 && (
                        <span className="text-xs bg-primary text-primary-foreground min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full font-bold">
                          {contact.unreadCount}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(contact.lastTimestamp).getTime() > 0
                          ? format(new Date(contact.lastTimestamp), "HH:mm")
                          : ""}
                      </span>
                    </div>
                  </div>
                  {transferredContacts.has(contact.jid) && (
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full font-medium">
                            <ArrowRightLeft className="w-3 h-3" />
                            Transferido
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                          Veio de: {transferredContacts.get(contact.jid)}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {activeTab === "em_atendimento" && getOperadorNome && (() => {
                    const nome = getOperadorNome(contact.jid);
                    return nome ? (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-500 font-medium">
                        <Headphones className="w-3 h-3" />
                        {nome}
                      </span>
                    ) : null;
                  })()}
                  <p className={cn(
                    "text-xs truncate",
                    contact.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>{contact.lastMessage}</p>
                </div>
              </button>
              {activeTab === "closed" && onReopenChat && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReopenChat(contact.jid);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs">
                      Reabrir atendimento
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          ))}

          {loadingMore && (
            <>
              <ContactSkeleton />
              <ContactSkeleton />
              <ContactSkeleton />
            </>
          )}

          {hasMoreContacts && !loadingMore && (
            <div ref={bottomSentinelRef} className="h-1" />
          )}
        </div>
      </ScrollArea>
    </>
  );
}
