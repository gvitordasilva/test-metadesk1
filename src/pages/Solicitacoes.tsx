import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ArrowUpDown, Loader2, Inbox, MessageCircle, Mic, Phone, Brain, AlertTriangle, TrendingUp, Minus, Frown, Angry, GitBranch, FileText, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useComplaints, type ComplaintFilters } from "@/hooks/useComplaints";
import { useWorkflows } from "@/hooks/useWorkflows";
import { ComplaintFiltersComponent } from "@/components/complaints/ComplaintFilters";
import {
  ComplaintStatusBadge,
  ComplaintTypeBadge,
} from "@/components/complaints/ComplaintStatusBadge";
import { ComplaintDetailModal } from "@/components/complaints/ComplaintDetailModal";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const channelLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  chatbot: { label: "Chatbot Assistido", icon: MessageCircle, color: "#7ae4ff" },
  chat: { label: "Chatbot Assistido", icon: MessageCircle, color: "#7ae4ff" },
  web: { label: "Formulário Escrito", icon: FileText, color: "#4deb92" },
  voice: { label: "Voz IA", icon: Mic, color: "#a18aff" },
  phone: { label: "Voz IA", icon: Phone, color: "#a18aff" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "#25D366" },
};

function ChannelBadge({ channel }: { channel?: string }) {
  const config = channelLabels[channel || ""] || { label: "Outros", icon: FileText, color: "#888888" };
  const Icon = config.icon;
  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="h-3 w-3" style={{ color: config.color }} />
      {config.label}
    </Badge>
  );
}

const sentimentConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  positivo: { icon: TrendingUp, color: "text-green-500", label: "Positivo" },
  neutro: { icon: Minus, color: "text-gray-400", label: "Neutro" },
  preocupado: { icon: AlertTriangle, color: "text-yellow-500", label: "Preocupado" },
  frustrado: { icon: Frown, color: "text-orange-500", label: "Frustrado" },
  irritado: { icon: Angry, color: "text-red-500", label: "Irritado" },
};

const urgencyConfig: Record<string, { color: string; label: string }> = {
  baixa: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", label: "Baixa" },
  media: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", label: "Média" },
  alta: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", label: "Alta" },
  critica: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", label: "Crítica" },
};

function AITriageBadge({ triage }: { triage: any }) {
  if (!triage) return <span className="text-xs text-muted-foreground">—</span>;
  
  const sentiment = sentimentConfig[triage.sentiment] || sentimentConfig.neutro;
  const urgency = urgencyConfig[triage.urgency] || urgencyConfig.media;
  const SentimentIcon = sentiment.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <SentimentIcon className={`h-3.5 w-3.5 ${sentiment.color}`} />
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${urgency.color}`}>
              {urgency.label}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium mb-1">Análise IA</p>
          <p className="text-xs">{triage.scenario_summary}</p>
          {triage.recommended_action && (
            <p className="text-xs mt-1 text-muted-foreground">💡 {triage.recommended_action}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function Solicitacoes() {
  const [filters, setFilters] = useState<ComplaintFilters>({});
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: complaints, isLoading, error } = useComplaints(filters);
  const { data: workflows } = useWorkflows();

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
    setIsModalOpen(true);
  };

  return (
    <MainLayout>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">Solicitações</h1>
            <p className="text-muted-foreground">
              Gerenciamento de reclamações, denúncias e sugestões
            </p>
          </div>
        </div>

        <ComplaintFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
        />

        <div className="rounded-lg border bg-background overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 flex-1" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-destructive">Erro ao carregar solicitações</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error.message}
              </p>
            </div>
          ) : complaints?.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhuma solicitação encontrada
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Quando houver solicitações, elas aparecerão aqui.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Protocolo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Brain className="h-3.5 w-3.5" />
                      Triagem IA
                    </div>
                  </TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Etapa Atual</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="w-[120px]">
                    <div className="flex items-center">
                      Data
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints?.map((complaint) => {
                  const stepInfo = complaint.current_workflow_step_id
                    ? stepLookup[complaint.current_workflow_step_id]
                    : null;

                  return (
                  <TableRow
                    key={complaint.id}
                    className={`cursor-pointer hover:bg-muted/50 ${complaint.status === "novo" ? "font-semibold bg-yellow-50/50 dark:bg-yellow-950/10" : ""}`}
                    onClick={() => handleViewDetails(complaint.id)}
                  >
                    <TableCell className="font-mono text-sm font-medium text-primary">
                      {complaint.protocol_number}
                    </TableCell>
                    <TableCell>
                      <ComplaintTypeBadge type={complaint.type} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{complaint.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <ChannelBadge channel={complaint.channel ?? undefined} />
                    </TableCell>
                    <TableCell>
                      <AITriageBadge triage={(complaint as any).ai_triage} />
                    </TableCell>
                    <TableCell>
                      {complaint.is_anonymous
                        ? "Anônimo"
                        : complaint.reporter_name || "Não informado"}
                    </TableCell>
                    <TableCell>
                      <ComplaintStatusBadge status={complaint.status} />
                    </TableCell>
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
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(complaint.created_at), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Abrir menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(complaint.id);
                            }}
                          >
                            Visualizar detalhes
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <ComplaintDetailModal
        complaintId={selectedComplaintId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </MainLayout>
  );
}
