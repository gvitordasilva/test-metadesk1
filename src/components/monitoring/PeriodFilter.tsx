import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, GitCompareArrows } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export interface PeriodSelection {
  from: Date;
  to: Date;
  label: string;
}

export interface PeriodFilterProps {
  period: PeriodSelection;
  comparisonPeriod: PeriodSelection | null;
  onPeriodChange: (period: PeriodSelection) => void;
  onComparisonChange: (period: PeriodSelection | null) => void;
}

type PresetKey = "7d" | "15d" | "30d" | "mes_atual" | "mes_anterior" | "custom";

const presets: { key: PresetKey; label: string; getRange: () => { from: Date; to: Date } }[] = [
  {
    key: "7d",
    label: "Últimos 7 dias",
    getRange: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }),
  },
  {
    key: "15d",
    label: "Últimos 15 dias",
    getRange: () => ({ from: startOfDay(subDays(new Date(), 14)), to: endOfDay(new Date()) }),
  },
  {
    key: "30d",
    label: "Últimos 30 dias",
    getRange: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }),
  },
  {
    key: "mes_atual",
    label: "Mês atual",
    getRange: () => ({ from: startOfMonth(new Date()), to: endOfDay(new Date()) }),
  },
  {
    key: "mes_anterior",
    label: "Mês anterior",
    getRange: () => {
      const prev = subMonths(new Date(), 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    },
  },
];

const comparisonPresets: { key: string; label: string; getRange: (main: PeriodSelection) => { from: Date; to: Date } }[] = [
  {
    key: "periodo_anterior",
    label: "Período anterior",
    getRange: (main) => {
      const diff = main.to.getTime() - main.from.getTime();
      return { from: new Date(main.from.getTime() - diff), to: new Date(main.from.getTime() - 1) };
    },
  },
  {
    key: "mes_anterior",
    label: "Mesmo período mês anterior",
    getRange: (main) => {
      const from = subMonths(main.from, 1);
      const to = subMonths(main.to, 1);
      return { from, to };
    },
  },
];

export function PeriodFilter({ period, comparisonPeriod, onPeriodChange, onComparisonChange }: PeriodFilterProps) {
  const [activePreset, setActivePreset] = useState<PresetKey>("7d");
  const [showComparison, setShowComparison] = useState(!!comparisonPeriod);
  const [compPreset, setCompPreset] = useState("periodo_anterior");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [customOpen, setCustomOpen] = useState(false);

  const handlePreset = (key: PresetKey) => {
    if (key === "custom") {
      setCustomOpen(true);
      setActivePreset("custom");
      return;
    }
    setActivePreset(key);
    const preset = presets.find((p) => p.key === key)!;
    const range = preset.getRange();
    const newPeriod = { ...range, label: preset.label };
    onPeriodChange(newPeriod);
    if (showComparison) {
      updateComparison(newPeriod, compPreset);
    }
  };

  const handleCustomSelect = (range: DateRange | undefined) => {
    setCustomRange(range);
    if (range?.from && range?.to) {
      const newPeriod = {
        from: startOfDay(range.from),
        to: endOfDay(range.to),
        label: `${format(range.from, "dd/MM/yy")} - ${format(range.to, "dd/MM/yy")}`,
      };
      onPeriodChange(newPeriod);
      if (showComparison) {
        updateComparison(newPeriod, compPreset);
      }
      setCustomOpen(false);
    }
  };

  const updateComparison = (mainPeriod: PeriodSelection, preset: string) => {
    const comp = comparisonPresets.find((c) => c.key === preset);
    if (comp) {
      const range = comp.getRange(mainPeriod);
      onComparisonChange({ ...range, label: comp.label });
    }
  };

  const toggleComparison = (on: boolean) => {
    setShowComparison(on);
    if (on) {
      updateComparison(period, compPreset);
    } else {
      onComparisonChange(null);
    }
  };

  const handleCompPreset = (key: string) => {
    setCompPreset(key);
    updateComparison(period, key);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Preset buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {presets.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={activePreset === p.key ? "default" : "outline"}
            className="text-xs h-8"
            onClick={() => handlePreset(p.key)}
          >
            {p.label}
          </Button>
        ))}
        {/* Custom date picker */}
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant={activePreset === "custom" ? "default" : "outline"}
              className="text-xs h-8 gap-1.5"
              onClick={() => handlePreset("custom")}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {activePreset === "custom" ? period.label : "Personalizado"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={customRange}
              onSelect={handleCustomSelect}
              numberOfMonths={2}
              locale={ptBR}
              disabled={(date) => date > new Date()}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Comparison toggle */}
      <div className="flex items-center gap-2 ml-2 border-l pl-3 border-border">
        <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="compare-toggle" className="text-xs text-muted-foreground cursor-pointer">
          Comparar
        </Label>
        <Switch id="compare-toggle" checked={showComparison} onCheckedChange={toggleComparison} />
        {showComparison && (
          <Select value={compPreset} onValueChange={handleCompPreset}>
            <SelectTrigger className="h-8 w-[200px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {comparisonPresets.map((c) => (
                <SelectItem key={c.key} value={c.key} className="text-xs">
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Active period badge */}
      <Badge variant="secondary" className="text-xs ml-auto">
        {format(period.from, "dd/MM/yy")} — {format(period.to, "dd/MM/yy")}
      </Badge>
      {comparisonPeriod && (
        <Badge variant="outline" className="text-xs">
          vs {format(comparisonPeriod.from, "dd/MM/yy")} — {format(comparisonPeriod.to, "dd/MM/yy")}
        </Badge>
      )}
    </div>
  );
}
