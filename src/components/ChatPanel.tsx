import { useState, useMemo, useRef, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2, CheckSquare, Square, Trash2, X, Check, CheckCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Message } from "@/types/message";
import { MediaMessage } from "@/components/MediaMessage";

interface ChatPanelProps {
  messages: Message[];
  selectedInstance: string | null;
  selectedContact?: string | null;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  hasMore?: boolean;
  searchQuery?: string;
  onDeleteMessages?: (ids: string[]) => Promise<void>;
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-300 dark:bg-yellow-500/40 text-inherit rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function ChatPanel({ messages, selectedInstance, selectedContact, onLoadMore, loadingMore, hasMore, searchQuery = "", onDeleteMessages }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(0);
  const isInitialLoad = useRef(true);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const allMessages = useMemo(() => {
    // Deduplicate: keep first occurrence by whatsapp_id (or id as fallback)
    const deduped = new Map<string, Message>();
    messages.forEach(m => {
      const key = m.whatsapp_id || m.id;
      if (!deduped.has(key)) deduped.set(key, m);
    });
    return [...deduped.values()].sort((a, b) => {
      const aSeconds = Math.floor(new Date(a.created_at).getTime() / 1000);
      const bSeconds = Math.floor(new Date(b.created_at).getTime() / 1000);
      if (aSeconds !== bSeconds) return aSeconds - bSeconds;
      // Same second: client (is_from_me=false) before bot (is_from_me=true)
      if (a.is_from_me !== b.is_from_me) return a.is_from_me ? 1 : -1;
      return a.id.localeCompare(b.id);
    });
  }, [messages]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Message[]>();
    allMessages.forEach((msg) => {
      const dateKey = format(new Date(msg.created_at), "yyyy-MM-dd");
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(msg);
    });
    return groups;
  }, [allMessages]);

  // Scroll to bottom on initial load, contact change, or new messages
  useEffect(() => {
    if (allMessages.length === 0) return;
    
    if (isInitialLoad.current) {
      // Use multiple timeouts to ensure scroll after render
      const timer = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "instant" });
      }, 100);
      isInitialLoad.current = false;
      prevMessageCount.current = allMessages.length;
      return () => clearTimeout(timer);
    }
    
    // New messages arrived - always scroll to bottom
    if (allMessages.length > prevMessageCount.current) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 50);
      });
    }
    prevMessageCount.current = allMessages.length;
  }, [allMessages]);

  useEffect(() => {
    isInitialLoad.current = true;
    prevMessageCount.current = 0;
    exitSelectMode();
  }, [selectedInstance, selectedContact]);

  // Intersection observer for scroll-to-top loading
  useEffect(() => {
    if (!onLoadMore || !hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          const container = scrollContainerRef.current;
          const prevHeight = container?.scrollHeight || 0;
          onLoadMore();
          if (container) {
            requestAnimationFrame(() => {
              const newHeight = container.scrollHeight;
              container.scrollTop += newHeight - prevHeight;
            });
          }
        }
      },
      { threshold: 0.1 }
    );
    if (topRef.current) observer.observe(topRef.current);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loadingMore]);

  if (allMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Nenhuma mensagem encontrada</p>
          <p className="text-sm">
            {selectedInstance
              ? `Sem mensagens para a instância "${selectedInstance}"`
              : "Selecione uma instância ou ajuste os filtros"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Selection toolbar */}
      {selectedContact && onDeleteMessages && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border bg-muted/50">
          {!selectMode ? (
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" onClick={() => setSelectMode(true)}>
              <CheckSquare className="w-3.5 h-3.5" />
              Selecionar mensagens
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={exitSelectMode}>
                <X className="w-3.5 h-3.5" />
                Cancelar
              </Button>
              <span className="text-xs text-muted-foreground">
                {selectedIds.size} selecionada{selectedIds.size !== 1 ? "s" : ""}
              </span>
              <div className="flex-1" />
              {selectedIds.size > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="h-7 gap-1.5 text-xs">
                      <Trash2 className="w-3.5 h-3.5" />
                      Apagar ({selectedIds.size})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Apagar mensagens?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {selectedIds.size} mensagem{selectedIds.size !== 1 ? "ns serão apagadas" : " será apagada"} permanentemente. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          await onDeleteMessages([...selectedIds]);
                          exitSelectMode();
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Apagar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}
        </div>
      )}

      <ScrollArea className="flex-1 scrollbar-thin" ref={(el) => {
        if (el) {
          const viewport = el.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement;
          if (viewport) scrollContainerRef.current = viewport;
        }
      }}>
        <div className="px-6 py-6 space-y-6">
          <div ref={topRef} className="h-1" />

          {loadingMore && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-xs text-muted-foreground">Carregando mensagens anteriores...</span>
            </div>
          )}

          {!hasMore && allMessages.length > 0 && (
            <div className="flex items-center justify-center py-2">
              <span className="text-xs text-muted-foreground">Início da conversa</span>
            </div>
          )}

          {[...groupedByDate.entries()].map(([dateKey, msgs]) => (
            <div key={dateKey}>
              <div className="flex items-center justify-center mb-4">
                <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full font-medium">
                  {format(new Date(dateKey), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </span>
              </div>

              <div className="space-y-1.5">
                {msgs.map((msg) => {
                  const isOutgoing = msg.is_from_me;
                  const isSelected = selectedIds.has(msg.id);
                  return (
                    <div
                      key={msg.id}
                      data-msg-id={msg.whatsapp_id || msg.id}
                      className={cn(
                        "flex items-center gap-2",
                        isOutgoing ? "justify-end" : "justify-start",
                        selectMode && "cursor-pointer",
                        isSelected && "bg-primary/5 rounded-lg -mx-2 px-2 py-0.5"
                      )}
                      onClick={selectMode ? () => toggleSelect(msg.id) : undefined}
                    >
                      {selectMode && !isOutgoing && (
                        isSelected
                          ? <CheckSquare className="w-4 h-4 text-primary flex-shrink-0" />
                          : <Square className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <div
                        className={cn(
                          "relative max-w-[70%] rounded-2xl px-4 py-2.5 pb-5 shadow-sm",
                          isOutgoing
                            ? "bg-chat-outgoing text-[hsl(var(--chat-outgoing-foreground))] rounded-br-md"
                            : "bg-chat-incoming rounded-bl-md"
                        )}
                      >
                        {!isOutgoing && msg.push_name && (
                          <p className="text-xs font-semibold text-primary mb-0.5">
                            {msg.push_name}
                          </p>
                        )}
                        {isOutgoing && (
                          <p className="text-xs font-semibold opacity-75 mb-0.5">
                            {msg.instance_name}
                          </p>
                        )}
                        {msg.media_type && (
                          <MediaMessage
                            mediaType={msg.media_type}
                            mediaUrl={msg.media_url}
                            mediaMimetype={msg.media_mimetype}
                            mediaFilename={msg.media_filename}
                            messageId={msg.id}
                            instanceName={msg.instance_name}
                          />
                        )}
                        {msg.message_text && (
                          <p className="text-sm whitespace-pre-wrap break-words">
                            <HighlightedText text={msg.message_text} query={searchQuery} />
                          </p>
                        )}
                        {!msg.media_type && !msg.message_text && (
                          <p className="text-sm italic text-muted-foreground">[mídia não suportada]</p>
                        )}
                        <div className={cn(
                          "absolute bottom-1 right-2 flex items-center gap-1",
                        )}>
                          <span className={cn(
                            "text-[10px] leading-none",
                            isOutgoing ? "text-muted-foreground/70" : "text-muted-foreground"
                          )}>
                            {format(new Date(msg.created_at), "HH:mm")}
                          </span>
                          {msg.status === "error" || msg.status === "failed" ? (
                            <AlertCircle className="w-3 h-3 text-destructive" />
                          ) : msg.status === "read" ? (
                            <CheckCheck className="w-3 h-3 text-blue-500" />
                          ) : msg.status === "delivered" ? (
                            <CheckCheck className="w-3 h-3 opacity-60" />
                          ) : msg.status === "sent" || isOutgoing ? (
                            <Check className="w-3 h-3 opacity-60" />
                          ) : null}
                        </div>
                      </div>
                      {selectMode && isOutgoing && (
                        isSelected
                          ? <CheckSquare className="w-4 h-4 text-primary flex-shrink-0" />
                          : <Square className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
