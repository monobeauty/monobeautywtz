import { useState, useMemo } from "react";
import { useMessages } from "@/hooks/useMessages";
import { InstanceSidebar } from "@/components/InstanceSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Download, FileText } from "lucide-react";
import { format, startOfDay, endOfDay, isWithinInterval, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const Reports = () => {
  const { messages, instances } = useMessages();
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [instanceFilter, setInstanceFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let result = messages;
    if (instanceFilter !== "all") {
      result = result.filter((m) => m.instance_name === instanceFilter);
    }
    if (dateRange.from) {
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      result = result.filter((m) => isWithinInterval(new Date(m.created_at), { start: from, end: to }));
    }
    return result;
  }, [messages, instanceFilter, dateRange]);

  const stats = useMemo(() => {
    const uniqueContacts = new Set(filtered.map((m) => m.remote_jid)).size;
    const sent = filtered.filter((m) => m.is_from_me).length;
    const received = filtered.filter((m) => !m.is_from_me).length;
    const byInstance: Record<string, number> = {};
    filtered.forEach((m) => {
      byInstance[m.instance_name] = (byInstance[m.instance_name] || 0) + 1;
    });
    return { total: filtered.length, uniqueContacts, sent, received, byInstance };
  }, [filtered]);

  const exportCSV = () => {
    const header = "Data,Instância,Contato,Nome,Direção,Mensagem\n";
    const rows = filtered.map((m) =>
      [
        format(new Date(m.created_at), "yyyy-MM-dd HH:mm:ss"),
        m.instance_name,
        m.remote_jid.replace(/@.*/, ""),
        (m.push_name || "").replace(/,/g, " "),
        m.is_from_me ? "Enviada" : "Recebida",
        `"${(m.message_text || "[mídia]").replace(/"/g, '""')}"`,
      ].join(",")
    ).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado com sucesso!");
  };

  const dateLabel = dateRange.from
    ? dateRange.to
      ? `${format(dateRange.from, "dd/MM/yyyy")} — ${format(dateRange.to, "dd/MM/yyyy")}`
      : format(dateRange.from, "dd/MM/yyyy")
    : "Selecionar período";

  return (
    <div className="flex h-screen bg-background">
      <div className="w-80">
        <InstanceSidebar instances={instances} selected={null} onSelect={() => {}} messageCounts={{}} />
      </div>
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={instanceFilter} onValueChange={setInstanceFilter}>
              <SelectTrigger className="w-44 h-9 text-sm">
                <SelectValue placeholder="Instância" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas instâncias</SelectItem>
                {instances.map((inst) => (
                  <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 text-sm gap-1.5">
                  <CalendarIcon className="w-4 h-4" />
                  {dateLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange.from ? { from: dateRange.from, to: dateRange.to } : undefined}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                  locale={ptBR}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Button onClick={exportCSV} className="h-9 text-sm gap-1.5">
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Total Mensagens</p>
              <p className="text-2xl font-bold text-foreground">{stats.total.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Contatos Únicos</p>
              <p className="text-2xl font-bold text-foreground">{stats.uniqueContacts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Enviadas</p>
              <p className="text-2xl font-bold text-primary">{stats.sent.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Recebidas</p>
              <p className="text-2xl font-bold text-foreground">{stats.received.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* By Instance breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Detalhamento por Instância
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byInstance).map(([inst, count]) => {
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={inst}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-foreground">{inst}</span>
                      <span className="text-muted-foreground">{count.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {Object.keys(stats.byInstance).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum dado encontrado para o período selecionado.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Prévia dos Dados ({Math.min(filtered.length, 50)} de {filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Data</th>
                    <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Instância</th>
                    <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Contato</th>
                    <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Direção</th>
                    <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Mensagem</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 50).map((m) => (
                    <tr key={m.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(m.created_at), "dd/MM HH:mm")}
                      </td>
                      <td className="px-4 py-2 text-xs">{m.instance_name}</td>
                      <td className="px-4 py-2 text-xs">{m.push_name || m.remote_jid.replace(/@.*/, "")}</td>
                      <td className="px-4 py-2 text-xs">
                         <span className={cn(
                           "px-1.5 py-0.5 rounded text-xs font-medium",
                          m.is_from_me ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          {m.is_from_me ? "Enviada" : "Recebida"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs truncate max-w-[300px]">{m.message_text || "[mídia]"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
