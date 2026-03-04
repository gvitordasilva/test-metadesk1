import { useState, useRef, useCallback } from "react";
import { FileDown, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface ReportGeneratorProps {
  metrics: {
    dailyData: Record<string, unknown>[];
    channelData: Record<string, unknown>[];
    satisfacaoData: Record<string, unknown>[];
    period: string;
  };
}

export function ReportGenerator({ metrics }: ReportGeneratorProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const generateReport = useCallback(async () => {
    setIsGenerating(true);
    setIsOpen(true);
    setReport(null);
    try {
      const { data, error } = await supabase.functions.invoke("monitoring-ai-analysis", {
        body: { type: "report", metrics },
      });

      if (error) {
        console.error("Report invoke error:", error);
        throw new Error(typeof error === "object" && error.message ? error.message : "Erro na chamada da função");
      }

      if (data?.error) {
        console.error("Report response error:", data.error);
        throw new Error(data.error);
      }

      if (!data?.analysis) {
        throw new Error("Resposta sem relatório");
      }

      setReport(data.analysis);
    } catch (err: any) {
      console.error("Report generation error:", err);
      toast({
        variant: "destructive",
        title: "Erro ao gerar relatório",
        description: err?.message || "Não foi possível gerar o relatório. Tente novamente.",
      });
      setIsOpen(false);
    } finally {
      setIsGenerating(false);
    }
  }, [metrics, toast]);

  const exportAsImage = useCallback(async () => {
    if (!reportRef.current) return;

    try {
      toast({ title: "Exportando...", description: "Gerando imagem do relatório." });

      const { default: html2canvas } = await import("html2canvas");

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        width: reportRef.current.scrollWidth,
        height: reportRef.current.scrollHeight,
      });

      const link = document.createElement("a");
      link.download = `relatorio-monitoramento-${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast({ title: "Relatório exportado!", description: "A imagem foi salva com sucesso." });
    } catch (err) {
      console.error("Export error:", err);
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: "Não foi possível exportar o relatório.",
      });
    }
  }, [toast]);

  return (
    <>
      <Button onClick={generateReport} disabled={isGenerating} className="gap-2">
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Gerando...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Gerar Relatório IA
          </>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Relatório de Monitoramento
              </DialogTitle>
              {report && (
                <Button onClick={exportAsImage} variant="outline" size="sm" className="gap-2 mr-8">
                  <FileDown className="h-4 w-4" />
                  Exportar Imagem
                </Button>
              )}
            </div>
          </DialogHeader>

          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Analisando indicadores do período...</p>
            </div>
          ) : report ? (
            <div
              ref={reportRef}
              className="bg-white p-8 rounded-lg"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <img src="/metadesk-logo-dark.svg" alt="Metadesk" className="h-8" />
                <div className="ml-auto text-right">
                  <p className="text-xs text-muted-foreground">Relatório gerado em</p>
                  <p className="text-sm font-medium">
                    {new Date().toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <div className="prose prose-sm max-w-none text-foreground">
                <ReactMarkdown>{report}</ReactMarkdown>
              </div>

              <div className="mt-8 pt-4 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">
                  Relatório gerado por IA • Metadesk • {metrics.period}
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
