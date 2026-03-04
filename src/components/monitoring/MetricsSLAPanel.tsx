import { Card, CardContent } from "@/components/ui/card";
import { useAdvancedMetrics } from "@/hooks/useAdvancedMetrics";
import { useSlaSettings } from "@/hooks/useSlaSettings";
import { cn } from "@/lib/utils";
import {
  Clock, Timer, Target, AlertTriangle, TrendingUp,
  Gauge, ThumbsUp, Inbox, Loader2, CheckCircle2, Eye, FileText
} from "lucide-react";

const metricIcons: Record<string, React.ElementType> = {
  tma: Clock,
  tme: Timer,
  frt: TrendingUp,
  fcr: Target,
  csat: ThumbsUp,
  nps: Gauge,
  abandono: AlertTriangle,
  backlog: Inbox,
  resolvidas: CheckCircle2,
  em_andamento: Eye,
  novas: FileText,
};

function getStatus(value: number, sla: { target: number; warning: number | null; critical: number | null } | undefined, isLowerBetter: boolean) {
  if (!sla) return "normal";
  if (isLowerBetter) {
    if (sla.critical != null && value >= sla.critical) return "critical";
    if (sla.warning != null && value >= sla.warning) return "warning";
  } else {
    if (sla.critical != null && value <= sla.critical) return "critical";
    if (sla.warning != null && value <= sla.warning) return "warning";
  }
  return "ok";
}

const statusColors = {
  ok: "border-green-500/50 bg-green-500/5",
  warning: "border-yellow-500/50 bg-yellow-500/5",
  critical: "border-red-500/50 bg-red-500/5",
  normal: "",
};

const statusDots = {
  ok: "bg-green-500",
  warning: "bg-yellow-500",
  critical: "bg-red-500",
  normal: "bg-muted",
};

export function MetricsSLAPanel() {
  const { data: metrics, isLoading: metricsLoading } = useAdvancedMetrics();
  const { data: slaSettings, isLoading: slaLoading } = useSlaSettings();

  if (metricsLoading || slaLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getSla = (key: string) => {
    const s = slaSettings?.find((sl) => sl.metric_key === key);
    return s ? { target: s.target_value, warning: s.warning_threshold, critical: s.critical_threshold } : undefined;
  };

  const operationalCards = [
    { key: "novas", label: "Novas", value: metrics?.totalNew ?? 0, unit: "", lowerBetter: true, color: "text-orange-500", description: "Solicitações recém-criadas que ainda não foram visualizadas ou atribuídas" },
    { key: "em_andamento", label: "Em Andamento", value: metrics?.totalInProgress ?? 0, unit: "", lowerBetter: false, color: "text-blue-500", description: "Solicitações que já foram atribuídas e estão sendo tratadas" },
    { key: "resolvidas", label: "Resolvidas", value: metrics?.totalResolved ?? 0, unit: "", lowerBetter: false, color: "text-green-500", description: "Solicitações finalizadas com resolução" },
    { key: "backlog", label: "Backlog", value: metrics?.backlog ?? 0, unit: "", lowerBetter: true, description: "Total de solicitações abertas aguardando resolução" },
  ];

  const slaCards = [
    { key: "tma", label: "TMA", value: metrics?.tma ?? 0, unit: "min", lowerBetter: true, description: "Tempo Médio de Atendimento — duração média das sessões de atendimento" },
    { key: "tme", label: "TME", value: metrics?.tme ?? 0, unit: "min", lowerBetter: true, description: "Tempo Médio de Espera — tempo médio que o cliente aguarda na fila" },
    { key: "frt", label: "FRT", value: metrics?.frt ?? 0, unit: "min", lowerBetter: true, description: "First Response Time — tempo até a primeira resposta ao cliente" },
    { key: "fcr", label: "FCR", value: metrics?.fcr ?? 0, unit: "%", lowerBetter: false, description: "First Contact Resolution — percentual de casos resolvidos no primeiro contato" },
    { key: "abandono", label: "Abandono", value: metrics?.abandonRate ?? 0, unit: "%", lowerBetter: true, description: "Taxa de Abandono — percentual de clientes que desistiram antes de serem atendidos" },
  ];

  return (
    <div className="space-y-3">
      {/* Status operacional */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {operationalCards.map((c) => {
          const Icon = metricIcons[c.key] || Inbox;
          return (
            <Card key={c.key} className="border" title={c.description}>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className={cn("h-3.5 w-3.5", c.color || "text-muted-foreground")} />
                  <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
                </div>
                <div className="text-2xl font-bold">
                  {c.value}
                  {c.unit && <span className="text-xs font-normal text-muted-foreground ml-0.5">{c.unit}</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* SLA indicators */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {slaCards.map((c) => {
          const sla = getSla(c.key);
          const status = getStatus(c.value, sla, c.lowerBetter);
          const Icon = metricIcons[c.key] || Inbox;

          return (
            <Card key={c.key} className={cn("border-2 transition-colors", statusColors[status])} title={c.description}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
                  </div>
                  <div className={cn("w-2 h-2 rounded-full", statusDots[status])} />
                </div>
                <div className="text-2xl font-bold">
                  {c.value}
                  <span className="text-xs font-normal text-muted-foreground ml-0.5">{c.unit}</span>
                </div>
                {sla && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Meta: {sla.target}{c.unit}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
