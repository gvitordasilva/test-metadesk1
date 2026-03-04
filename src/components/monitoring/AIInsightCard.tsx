import { useState } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AIInsightCardProps {
  indicatorName: string;
  metrics: Record<string, unknown>;
  className?: string;
}

export function AIInsightCard({ indicatorName, metrics, className }: AIInsightCardProps) {
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchAnalysis = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("monitoring-ai-analysis", {
        body: {
          type: "individual",
          metrics: { indicator: indicatorName, data: metrics },
        },
      });

      if (error) {
        console.error("AI analysis invoke error:", error);
        throw new Error(typeof error === "object" && error.message ? error.message : "Erro na chamada da função");
      }

      if (data?.error) {
        console.error("AI analysis response error:", data.error);
        throw new Error(data.error);
      }

      if (!data?.analysis) {
        throw new Error("Resposta sem análise");
      }

      setAnalysis(data.analysis);
      setHasLoaded(true);
    } catch (err: any) {
      console.error("AI analysis error:", err);
      toast({
        variant: "destructive",
        title: "Erro na análise IA",
        description: err?.message || "Não foi possível gerar a análise. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasLoaded && !isLoading) {
    return (
      <button
        onClick={fetchAnalysis}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-muted-foreground/30",
          "text-sm text-muted-foreground hover:bg-accent/50 hover:border-primary/40 transition-all cursor-pointer",
          className
        )}
      >
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <span>Gerar análise IA para {indicatorName}</span>
      </button>
    );
  }

  return (
    <div className={cn(
      "w-full flex items-start gap-3 px-4 py-3 rounded-lg bg-accent/30 border border-primary/20",
      className
    )}>
      <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Analisando {indicatorName.toLowerCase()}...
          </div>
        ) : (
          <p className="text-sm text-foreground/80 leading-relaxed">{analysis}</p>
        )}
      </div>
      {hasLoaded && !isLoading && (
        <button onClick={fetchAnalysis} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
