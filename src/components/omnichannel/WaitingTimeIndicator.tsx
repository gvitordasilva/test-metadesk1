import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type WaitingTimeIndicatorProps = {
  waitingSince: Date | string;
  showLabel?: boolean;
  size?: "sm" | "md";
};

function getMinutesSince(date: Date | string): number {
  const startTime = typeof date === "string" ? new Date(date) : date;
  const now = Date.now();
  return Math.floor((now - startTime.getTime()) / 60000);
}

function formatWaitingTime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${mins > 0 ? ` ${mins}min` : ""}`;
}

function getWaitingColor(minutes: number): {
  text: string;
  bg: string;
  border: string;
} {
  if (minutes <= 5) {
    return {
      text: "text-green-600",
      bg: "bg-green-500/10",
      border: "border-green-500/30",
    };
  }
  if (minutes <= 15) {
    return {
      text: "text-yellow-600",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
    };
  }
  return {
    text: "text-red-600",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  };
}

export function WaitingTimeIndicator({
  waitingSince,
  showLabel = false,
  size = "md",
}: WaitingTimeIndicatorProps) {
  const minutes = getMinutesSince(waitingSince);
  const colors = getWaitingColor(minutes);
  const formatted = formatWaitingTime(minutes);

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded border",
        colors.bg,
        colors.border,
        size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1"
      )}
    >
      <Clock className={cn(colors.text, size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
      <span
        className={cn(
          "font-medium",
          colors.text,
          size === "sm" ? "text-xs" : "text-sm"
        )}
      >
        {formatted}
      </span>
      {showLabel && (
        <span className={cn("text-muted-foreground", size === "sm" ? "text-xs" : "text-sm")}>
          aguardando
        </span>
      )}
    </div>
  );
}

// Hook para usar com state reativo
export function useWaitingTime(waitingSince: Date | string | null) {
  if (!waitingSince) {
    return { minutes: 0, formatted: "0min", urgency: "low" as const };
  }

  const minutes = getMinutesSince(waitingSince);
  const formatted = formatWaitingTime(minutes);
  const urgency =
    minutes <= 5 ? ("low" as const) : minutes <= 15 ? ("medium" as const) : ("high" as const);

  return { minutes, formatted, urgency };
}
