import { useComplaints } from "@/hooks/useComplaints";
import { useWorkflows } from "@/hooks/useWorkflows";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Download, GitBranch } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  novo: { label: "Novo", variant: "destructive" },
  visualizado: { label: "Visualizado", variant: "default" },
  em_analise: { label: "Em Análise", variant: "default" },
  resolvido: { label: "Resolvido", variant: "secondary" },
  fechado: { label: "Fechado", variant: "outline" },
};

const channelMap: Record<string, string> = {
  whatsapp: "WhatsApp",
  chat: "Chat",
  email: "E-mail",
  telefone: "Telefone",
  formulario: "Formulário",
};

export function AtendimentosList() {
  const { data: complaints, isLoading } = useComplaints();
  const { data: workflows } = useWorkflows();

  // Build step lookup
  const stepLookup = (() => {
    const map: Record<string, { stepName: string; workflowName: string; responsibleName: string | null }> = {};
    if (!workflows) return map;
    for (const wf of workflows) {
      if (!wf.steps) continue;
      for (const step of wf.steps) {
        map[step.id] = {
          stepName: step.name,
          workflowName: wf.name,
          responsibleName: step.responsible?.name || null,
        };
      }
    }
    return map;
  })();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const atendimentos = complaints?.filter(c => c.status === "em_analise" || c.status === "resolvido" || c.assigned_to) || [];

  const handleExport = () => {
    exportToCsv(
      "atendimentos",
      ["Protocolo", "Canal", "Categoria", "Status", "Etapa Atual", "Fluxo", "Responsável", "Abertura", "Última Atualização"],
      atendimentos.map((item) => {
        const step = item.current_workflow_step_id ? stepLookup[item.current_workflow_step_id] : null;
        return [
          item.protocol_number,
          channelMap[item.channel || ""] || item.channel || "",
          item.category,
          statusMap[item.status]?.label || item.status,
          step?.stepName || "",
          step?.workflowName || "",
          step?.responsibleName || (item.assigned_to || ""),
          format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
          format(new Date(item.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        ];
      })
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Atendimentos em Andamento</CardTitle>
        {atendimentos.length > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {atendimentos.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum atendimento em andamento.</p>
        ) : (
          <div className="overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Etapa Atual</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Abertura</TableHead>
                  <TableHead>Última Atualização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atendimentos.map((item) => {
                  const status = statusMap[item.status] || { label: item.status, variant: "outline" as const };
                  const stepInfo = item.current_workflow_step_id ? stepLookup[item.current_workflow_step_id] : null;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.protocol_number}</TableCell>
                      <TableCell>{channelMap[item.channel || ""] || item.channel || "—"}</TableCell>
                      <TableCell className="capitalize">{item.category}</TableCell>
                      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                      <TableCell>
                        {stepInfo ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5">
                                  <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs">{stepInfo.stepName}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>Fluxo: {stepInfo.workflowName}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {stepInfo?.responsibleName || (item.assigned_to ? item.assigned_to : "—")}
                      </TableCell>
                      <TableCell className="text-xs">{format(new Date(item.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                      <TableCell className="text-xs">{format(new Date(item.updated_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
