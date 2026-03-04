import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSlaSettings, useUpdateSlaSetting, SlaSettingRow } from "@/hooks/useSlaSettings";
import { toast } from "sonner";
import { Save, Clock, Target, AlertTriangle, TrendingUp, Gauge, Users, ThumbsUp, Timer } from "lucide-react";
import { Loader2 } from "lucide-react";

const metricIcons: Record<string, React.ElementType> = {
  tma: Clock,
  tme: Timer,
  frt: TrendingUp,
  fcr: Target,
  csat: ThumbsUp,
  nps: Gauge,
  abandono: AlertTriangle,
  countdown_seconds: Users,
};

const unitLabels: Record<string, string> = {
  minutes: "minutos",
  percent: "%",
  score: "pontos",
  seconds: "segundos",
};

export function SLASettings() {
  const { data: settings, isLoading } = useSlaSettings();
  const updateMutation = useUpdateSlaSetting();
  const [editValues, setEditValues] = useState<Record<string, { target: string; warning: string; critical: string }>>({});

  const getEditValue = (s: SlaSettingRow) =>
    editValues[s.id] || {
      target: String(s.target_value),
      warning: s.warning_threshold != null ? String(s.warning_threshold) : "",
      critical: s.critical_threshold != null ? String(s.critical_threshold) : "",
    };

  const handleChange = (id: string, field: "target" | "warning" | "critical", value: string) => {
    setEditValues((prev) => ({
      ...prev,
      [id]: { ...getEditValue(settings!.find((s) => s.id === id)!), [field]: value },
    }));
  };

  const handleSave = async (s: SlaSettingRow) => {
    const vals = getEditValue(s);
    try {
      await updateMutation.mutateAsync({
        id: s.id,
        target_value: parseFloat(vals.target) || 0,
        warning_threshold: vals.warning ? parseFloat(vals.warning) : null,
        critical_threshold: vals.critical ? parseFloat(vals.critical) : null,
      });
      toast.success(`SLA "${s.metric_label}" atualizado!`);
      setEditValues((prev) => {
        const copy = { ...prev };
        delete copy[s.id];
        return copy;
      });
    } catch {
      toast.error("Erro ao salvar SLA");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Configuração de SLAs</h2>
        <p className="text-muted-foreground text-sm">
          Defina metas e limites para os indicadores de atendimento. Esses valores são usados para monitoramento e alertas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(settings || []).map((s) => {
          const Icon = metricIcons[s.metric_key] || Target;
          const vals = getEditValue(s);
          const hasChanges =
            vals.target !== String(s.target_value) ||
            vals.warning !== (s.warning_threshold != null ? String(s.warning_threshold) : "") ||
            vals.critical !== (s.critical_threshold != null ? String(s.critical_threshold) : "");

          return (
            <Card key={s.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-sm">{s.metric_label}</CardTitle>
                    <CardDescription className="text-xs">
                      <Badge variant="outline" className="text-[10px]">
                        {unitLabels[s.unit] || s.unit}
                      </Badge>
                    </CardDescription>
                  </div>
                  {hasChanges && (
                    <Button size="sm" onClick={() => handleSave(s)} disabled={updateMutation.isPending}>
                      <Save className="h-3 w-3 mr-1" />
                      Salvar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground font-medium uppercase">Meta</label>
                    <Input
                      type="number"
                      value={vals.target}
                      onChange={(e) => handleChange(s.id, "target", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  {s.metric_key !== "countdown_seconds" && (
                    <>
                      <div>
                        <label className="text-[10px] text-yellow-600 font-medium uppercase">Alerta</label>
                        <Input
                          type="number"
                          value={vals.warning}
                          onChange={(e) => handleChange(s.id, "warning", e.target.value)}
                          className="h-8 text-sm border-yellow-300"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-red-600 font-medium uppercase">Crítico</label>
                        <Input
                          type="number"
                          value={vals.critical}
                          onChange={(e) => handleChange(s.id, "critical", e.target.value)}
                          className="h-8 text-sm border-red-300"
                        />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
