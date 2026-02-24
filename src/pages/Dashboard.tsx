import { useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useMessages } from "@/hooks/useMessages";
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Users, ArrowRightLeft, MessageSquare, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { InstanceSidebar } from "@/components/InstanceSidebar";

const COLORS = ["hsl(142,55%,35%)", "hsl(210,15%,50%)", "hsl(0,72%,51%)", "hsl(45,93%,47%)"];

const Dashboard = () => {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const { instances } = useMessages();

  const {
    loading,
    volumeByInstance,
    funnelOptions,
    messagesPerDay,
    messagesByHour,
    newClientsToday,
    transferRate,
    totalMessages,
  } = useDashboardData(dateRange);

  const dateLabel = dateRange.from
    ? dateRange.to
      ? `${format(dateRange.from, "dd/MM/yyyy")} — ${format(dateRange.to, "dd/MM/yyyy")}`
      : format(dateRange.from, "dd/MM/yyyy")
    : "Todos os períodos";

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="w-80">
          <InstanceSidebar instances={instances} selected={null} onSelect={() => {}} messageCounts={{}} />
        </div>
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-72 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="w-80">
        <InstanceSidebar instances={instances} selected={null} onSelect={() => {}} messageCounts={{}} />
      </div>
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Header with date filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal h-9 text-sm",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange.from ? { from: dateRange.from, to: dateRange.to } : undefined}
                  onSelect={(range) =>
                    setDateRange({ from: range?.from, to: range?.to })
                  }
                  numberOfMonths={2}
                  locale={ptBR}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {dateRange.from && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setDateRange({ from: undefined, to: undefined })}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard
            icon={<Users className="w-5 h-5 text-primary" />}
            title="Novos Clientes Hoje"
            value={newClientsToday}
          />
          <SummaryCard
            icon={<ArrowRightLeft className="w-5 h-5 text-primary" />}
            title="Taxa de Transmissão"
            value={`${transferRate}%`}
            subtitle="Escolheram opção 2"
          />
          <SummaryCard
            icon={<MessageSquare className="w-5 h-5 text-primary" />}
            title="Mensagens Trocadas"
            value={totalMessages.toLocaleString()}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Volume por Instância</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={volumeByInstance} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {volumeByInstance.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <ReTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Funil de Opções</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelOptions}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ReTooltip />
                  <Bar dataKey="value" fill="hsl(142,55%,35%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Atendimentos por Dia {dateRange.from ? "" : "(Última Semana)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={messagesPerDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ReTooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(142,55%,35%)" strokeWidth={2}
                    dot={{ r: 4, fill: "hsl(142,55%,35%)" }} name="Mensagens" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Horários de Pico</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={messagesByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ReTooltip />
                  <Bar dataKey="count" fill="hsl(210,15%,50%)" radius={[4, 4, 0, 0]} name="Mensagens" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

function SummaryCard({ icon, title, value, subtitle }: { icon: React.ReactNode; title: string; value: string | number; subtitle?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
