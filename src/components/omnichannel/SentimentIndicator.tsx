import { Smile, Meh, Frown, Angry } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Sentiment = "positive" | "neutral" | "frustrated" | "angry" | null;

type SentimentIndicatorProps = {
  sentiment: Sentiment;
  size?: "sm" | "md" | "lg";
};

const sentimentConfig = {
  positive: {
    icon: Smile,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    label: "Positivo",
    description: "Cliente demonstra satisfação",
  },
  neutral: {
    icon: Meh,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    label: "Neutro",
    description: "Cliente em estado neutro",
  },
  frustrated: {
    icon: Frown,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    label: "Frustrado",
    description: "Cliente demonstra frustração",
  },
  angry: {
    icon: Angry,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    label: "Irritado",
    description: "Atenção! Cliente irritado",
  },
};

const sizeConfig = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function SentimentIndicator({
  sentiment,
  size = "md",
}: SentimentIndicatorProps) {
  if (!sentiment) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Meh className={cn(sizeConfig[size], "opacity-50")} />
        <span>Analisando...</span>
      </div>
    );
  }

  const config = sentimentConfig[sentiment];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded-md",
              config.bgColor
            )}
          >
            <Icon className={cn(sizeConfig[size], config.color)} />
            <span className={cn("text-sm font-medium", config.color)}>
              {config.label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
