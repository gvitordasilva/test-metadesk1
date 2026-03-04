import { useState } from "react";
import { useComplaints } from "@/hooks/useComplaints";
import { useWorkflows } from "@/hooks/useWorkflows";
import { ComplaintDetailModal } from "@/components/complaints/ComplaintDetailModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Eye, GitBranch, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/exportCsv";

const typeLabels: Record<string, string> = {
  reclamacao: "Reclamação",
  denuncia: "Denúncia",
  sugestao: "Sugestão",
  elogio: "Elogio",
};

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  novo: { label: "Novo", variant: "destructive" },
  visualizado: { label: "Visualizado", variant: "default" },
  em_analise: { label: "Em Análise", variant: "default" },
  resolvido: { label: "Resolvido", variant: "secondary" },
  fechado: { label: "Fechado", variant: "outline" },
};

export function SolicitacoesList() {
  const { data: complaints, isLoading } = useComplaints();
  const { data: workflows } = useWorkflows();
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Build a lookup: stepId -> { stepName, workflowName, responsibleName }
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

  const handleViewDetails = (id: string) => {
    setSelectedComplaintId(id);
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const handleExport = () => {
    if (!complaints?.length) return;
    exportToCsv(
      "solicitacoes",
      ["Protocolo", "Tipo", "Categoria", "Solicitante", "Status", "Etapa Atual", "Fluxo", "Responsável", "Data"],
      complaints.map((item) => {
        const step = item.current_workflow_step_id ? stepLookup[item.current_workflow_step_id] : null;
        return [
          item.protocol_number,
          typeLabels[item.type] || item.type,
          item.category,
          item.is_anonymous ? "Anônimo" : (item.reporter_name || ""),
          statusMap[item.status]?.label || item.status,
          step?.stepName || "",
          step?.workflowName || "",
          step?.responsibleName || (item.assigned_to || ""),
          format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        ];
      })
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Todas as Solicitações</CardTitle>
          {complaints && complaints.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!complaints?.length ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma solicitação encontrada.</p>
          ) : (
            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Etapa Atual</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaints.map((item) => {
                    const status = statusMap[item.status] || { label: item.status, variant: "outline" as const };
                    const stepInfo = item.current_workflow_step_id
                      ? stepLookup[item.current_workflow_step_id]
                      : null;

                    return (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewDetails(item.id)}
                      >
                        <TableCell className="font-mono text-xs">{item.protocol_number}</TableCell>
                        <TableCell>{typeLabels[item.type] || item.type}</TableCell>
                        <TableCell className="capitalize">{item.category}</TableCell>
                        <TableCell>{item.is_anonymous ? "Anônimo" : (item.reporter_name || "—")}</TableCell>
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
                                <TooltipContent>
                                  Fluxo: {stepInfo.workflowName}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {stepInfo?.responsibleName ? (
                            <span className="text-xs">{stepInfo.responsibleName}</span>
                          ) : item.assigned_to ? (
                            <span className="text-xs">{item.assigned_to}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{format(new Date(item.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(item.id);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ComplaintDetailModal
        complaintId={selectedComplaintId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
