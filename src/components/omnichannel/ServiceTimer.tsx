import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type ServiceTimerProps = {
  formattedDuration: string;
  isActive: boolean;
};

export function ServiceTimer({ formattedDuration, isActive }: ServiceTimerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-sm",
        isActive
          ? "bg-green-500/10 text-green-600 border border-green-500/30"
          : "bg-muted text-muted-foreground"
      )}
    >
      <Clock className={cn("h-4 w-4", isActive && "animate-pulse")} />
      <span className="font-semibold">{formattedDuration}</span>
      {isActive && (
        <span className="text-xs opacity-70">em atendimento</span>
      )}
    </div>
  );
}
