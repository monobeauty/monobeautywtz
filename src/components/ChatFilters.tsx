import { Search, CalendarIcon, X, PhoneOff, Trash2, ChevronUp, ChevronDown, UserCheck, Headphones, RotateCcw } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { StatusAtendimento } from "@/hooks/useChatStatus";

interface ChatFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  dateRange: { from: Date | undefined; to: Date | undefined };
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  selectedInstance: string | null;
  selectedContactName?: string | null;
  selectedContactJid?: string | null;
  onFinishAttendance?: () => void;
  onCloseChat?: (remoteJid: string) => Promise<void>;
  onDeleteConversation?: (remoteJid: string) => Promise<void>;
  onAssumir?: (jid: string) => Promise<void>;
  onReopenChat?: (jid: string) => Promise<void>;
  contactStatus?: StatusAtendimento | null;
  operadorNome?: string | null;
  searchMatchCount?: number;
  currentSearchIndex?: number;
  onSearchNavigate?: (direction: "prev" | "next") => void;
  selectedContactProfilePic?: string | null;
}

export function ChatFilters({
  search,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  selectedInstance,
  selectedContactName,
  selectedContactJid,
  onFinishAttendance,
  onCloseChat,
  onDeleteConversation,
  onAssumir,
  onReopenChat,
  contactStatus,
  operadorNome,
  searchMatchCount = 0,
  currentSearchIndex = -1,
  onSearchNavigate,
  selectedContactProfilePic,
}: ChatFiltersProps) {
  const hasDateFilter = dateRange.from || dateRange.to;

  const handleFinish = async () => {
    if (!selectedContactJid) return;
    const phone = selectedContactJid.replace(/@.*/, "");

    try {
      const { data, error } = await supabase.functions.invoke("n8n-proxy", {
        body: {
          action: "delete",
          table: "bot_memoria",
          query: { eq: { telefone: phone } },
        },
      });

      if (error) throw error;

      if (onCloseChat) {
        await onCloseChat(selectedContactJid);
      }
      toast.success("Atendimento finalizado com sucesso");
      onFinishAttendance?.();
    } catch (err: any) {
      console.error("Erro ao finalizar:", err);
      toast.error("Erro ao finalizar atendimento");
    }
  };

  const handleAssumir = async () => {
    if (!selectedContactJid || !onAssumir) return;
    try {
      await onAssumir(selectedContactJid);
      toast.success("Atendimento assumido com sucesso");
    } catch (err) {
      console.error("Erro ao assumir:", err);
      toast.error("Erro ao assumir atendimento");
    }
  };

  return (
    <div className="border-b border-border bg-card px-6 py-3">
      <div className="flex items-center gap-3">
        {/* Contact info */}
        <div className="hidden sm:flex items-center gap-3 min-w-0">
          <Avatar className="w-9 h-9 flex-shrink-0">
            {selectedContactProfilePic && (
              <AvatarImage src={selectedContactProfilePic} alt={selectedContactName || ""} />
            )}
            <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
              {selectedContactName
                ? selectedContactName.slice(0, 2).toUpperCase()
                : selectedInstance ? selectedInstance.slice(0, 2).toUpperCase() : "TD"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <span className="font-semibold text-sm text-foreground truncate block">
              {selectedContactName || selectedInstance || "Todas as instâncias"}
            </span>
            {contactStatus === "em_atendimento" && operadorNome && (
              <span className="flex items-center gap-1 text-xs text-blue-500 font-medium">
                <Headphones className="w-3 h-3" />
                {operadorNome}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons based on contact status */}
        {selectedContactJid && (contactStatus === null || contactStatus === "finalizado") && onReopenChat && (
          <Button 
            size="sm" 
            className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={async () => {
              try {
                await onReopenChat(selectedContactJid);
                toast.success("Atendimento reaberto com sucesso");
              } catch (err) {
                console.error("Erro ao reabrir:", err);
                toast.error("Erro ao reabrir atendimento");
              }
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reabrir Atendimento</span>
          </Button>
        )}

        {selectedContactJid && (contactStatus === "pendente" || contactStatus === "no_record") && (
          <Button 
            size="sm" 
            className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleAssumir}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Assumir Atendimento</span>
          </Button>
        )}

        {selectedContactJid && contactStatus === "em_atendimento" && (
          <>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-8 gap-1.5 text-xs">
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Finalizar Atendimento</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Finalizar atendimento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O robô voltará a atender este contato automaticamente. Tem certeza?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleFinish} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Finalizar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {selectedContactJid && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-destructive/50 text-destructive hover:bg-destructive/10">
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Apagar Conversa</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apagar conversa?</AlertDialogTitle>
                <AlertDialogDescription>
                  Todas as mensagens deste contato serão apagadas permanentemente do banco de dados. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    if (selectedContactJid && onDeleteConversation) {
                      await onDeleteConversation(selectedContactJid);
                    }
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Apagar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <div className="flex-1" />

        {/* Search */}
        <div className="flex items-center gap-1">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar mensagem..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9 text-sm bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
          {search.trim() && (
            <div className="flex items-center gap-0.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[3rem] text-center">
                {searchMatchCount > 0 ? `${currentSearchIndex + 1}/${searchMatchCount}` : "0/0"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onSearchNavigate?.("prev")}
                disabled={searchMatchCount === 0}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onSearchNavigate?.("next")}
                disabled={searchMatchCount === 0}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Date filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-1.5 text-sm",
                hasDateFilter && "text-primary border-primary"
              )}
            >
              <CalendarIcon className="w-4 h-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <span className="hidden sm:inline">
                    {format(dateRange.from, "dd/MM")} - {format(dateRange.to, "dd/MM")}
                  </span>
                ) : (
                  <span className="hidden sm:inline">{format(dateRange.from, "dd/MM/yy")}</span>
                )
              ) : (
                <span className="hidden sm:inline">Data</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={dateRange as any}
              onSelect={(range: any) =>
                onDateRangeChange({ from: range?.from, to: range?.to })
              }
              locale={ptBR}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Clear filters */}
        {(search || hasDateFilter) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              onSearchChange("");
              onDateRangeChange({ from: undefined, to: undefined });
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
