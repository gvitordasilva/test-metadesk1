import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useComplaintTriage } from "@/hooks/useComplaintTriage";
import { WorkflowProgress } from "./WorkflowProgress";
import { EmailHistoryPanel } from "@/components/email/EmailHistoryPanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ComplaintStatusBadge, ComplaintTypeBadge } from "./ComplaintStatusBadge";
import { useComplaint, useUpdateComplaint, useAttendants, useComplaintAuditLog } from "@/hooks/useComplaints";
import { useWorkflows, type Workflow } from "@/hooks/useWorkflows";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Clock,
  Loader2,
  ExternalLink,
  History,
  ArrowRight,
  Brain,
  AlertTriangle,
  TrendingUp,
  Minus,
  Frown,
  Angry,
  Sparkles,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ComplaintDetailModalProps {
  complaintId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeOptions = [
  { value: "reclamacao", label: "Reclamação" },
  { value: "denuncia", label: "Denúncia" },
  { value: "sugestao", label: "Sugestão" },
  { value: "elogio", label: "Elogio" },
];

const categoryOptions = [
  "Atendimento",
  "Produto",
  "Serviço",
  "Infraestrutura",
  "Financeiro",
  "RH",
  "Segurança",
  "Meio Ambiente",
  "Outro",
];

const actionLabels: Record<string, string> = {
  reclassified_type: "Tipo reclassificado",
  reclassified_category: "Categoria reclassificada",
  reclassified: "Reclassificado",
  status_changed: "Status alterado",
  status_change: "Status alterado",
  assigned: "Responsável atribuído",
  workflow_changed: "Fluxo de trabalho alterado",
  workflow_assigned: "Fluxo de trabalho atribuído",
  workflow_advanced: "Fluxo avançou de etapa",
  notes_updated: "Notas internas atualizadas",
  viewed: "Solicitação visualizada",
  forwarded: "Encaminhado",
  resolved: "Solicitação resolvida",
  created: "Solicitação criada",
  session_ended: "Atendimento finalizado",
  email_sent: "Email enviado",
  email_received: "Email recebido",
};

const sentimentIcons: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  positivo: { icon: TrendingUp, color: "text-green-500", label: "Positivo" },
  neutro: { icon: Minus, color: "text-gray-400", label: "Neutro" },
  preocupado: { icon: AlertTriangle, color: "text-yellow-500", label: "Preocupado" },
  frustrado: { icon: Frown, color: "text-orange-500", label: "Frustrado" },
  irritado: { icon: Angry, color: "text-red-500", label: "Irritado" },
};

const urgencyColors: Record<string, string> = {
  baixa: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  media: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  alta: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critica: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function AITriageSection({ complaint, onRunTriage, isTriaging }: { complaint: any; onRunTriage: () => void; isTriaging: boolean }) {
  const triage = complaint.ai_triage;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Triagem IA
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onRunTriage}
          disabled={isTriaging}
          className="gap-1.5"
        >
          {isTriaging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {triage ? "Reanalisar" : "Analisar com IA"}
        </Button>
      </div>

      {triage ? (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-4">
            {(() => {
              const s = sentimentIcons[triage.sentiment] || sentimentIcons.neutro;
              const SIcon = s.icon;
              return (
                <div className="flex items-center gap-1.5">
                  <SIcon className={`h-4 w-4 ${s.color}`} />
                  <span className="text-sm font-medium">{s.label}</span>
                </div>
              );
            })()}
            <Badge className={urgencyColors[triage.urgency] || urgencyColors.media}>
              Urgência: {triage.urgency?.charAt(0).toUpperCase() + triage.urgency?.slice(1)}
            </Badge>
          </div>
          
          <p className="text-sm">{triage.scenario_summary}</p>
          
          {triage.risk_factors && triage.risk_factors.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Fatores de risco:</p>
              <div className="flex flex-wrap gap-1">
                {triage.risk_factors.map((f: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                ))}
              </div>
            </div>
          )}
          
          {triage.recommended_action && (
            <div className="flex items-start gap-2 text-sm bg-primary/5 p-2 rounded-md">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>{triage.recommended_action}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Clique em "Analisar com IA" para obter uma triagem automática desta solicitação.
        </p>
      )}
    </div>
  );
}

export function ComplaintDetailModal({
  complaintId,
  open,
  onOpenChange,
}: ComplaintDetailModalProps) {
  const queryClient = useQueryClient();
  const { data: complaint, isLoading } = useComplaint(complaintId);
  const { data: attendants } = useAttendants();
  const { data: workflows } = useWorkflows();
  const { data: auditLog } = useComplaintAuditLog(complaintId);
  const updateComplaint = useUpdateComplaint();
  const triageMutation = useComplaintTriage();
  const { toast } = useToast();

  const [internalNotes, setInternalNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);

  // Sync state when complaint loads
  useEffect(() => {
    if (complaint) {
      setInternalNotes(complaint.internal_notes || "");
      setSelectedStatus(complaint.status);
      setSelectedAssignee(complaint.assigned_to || "");
      setSelectedType(complaint.type);
      setSelectedCategory(complaint.category);
      setSelectedWorkflowId((complaint as any).workflow_id || "");
    }
  }, [complaint]);

  // Auto-mark as "visualizado" when opening a "novo" complaint
  useEffect(() => {
    if (!complaint || !open || complaint.status !== "novo") return;

    const markAsViewed = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
          .from("complaints")
          .update({
            status: "visualizado" as any,
            first_viewed_at: new Date().toISOString(),
            first_viewed_by: user.id,
          } as any)
          .eq("id", complaint.id);

        // Insert audit log entry
        await supabase
          .from("complaint_audit_log")
          .insert({
            complaint_id: complaint.id,
            action: "viewed",
            field_changed: "status",
            old_value: "novo",
            new_value: "visualizado",
            user_id: user.id,
          });

        // Invalidate queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ["complaint", complaint.id] });
        queryClient.invalidateQueries({ queryKey: ["complaints"] });
        queryClient.invalidateQueries({ queryKey: ["complaint-stats"] });
        queryClient.invalidateQueries({ queryKey: ["complaint-audit", complaint.id] });
      } catch (err) {
        console.error("Error marking complaint as viewed:", err);
      }
    };

    markAsViewed();
  }, [complaint?.id, open, complaint?.status]);

  const handleSaveChanges = async () => {
    if (!complaint) return;

    const auditEntries: Array<{
      complaint_id: string;
      action: string;
      field_changed: string;
      old_value: string | null;
      new_value: string | null;
    }> = [];

    const updates: Record<string, any> = {};

    // Track type change
    if (selectedType && selectedType !== complaint.type) {
      updates.type = selectedType;
      auditEntries.push({
        complaint_id: complaint.id,
        action: "reclassified_type",
        field_changed: "type",
        old_value: complaint.type,
        new_value: selectedType,
      });
    }

    // Track category change
    if (selectedCategory && selectedCategory !== complaint.category) {
      updates.category = selectedCategory;
      auditEntries.push({
        complaint_id: complaint.id,
        action: "reclassified_category",
        field_changed: "category",
        old_value: complaint.category,
        new_value: selectedCategory,
      });
    }

    // Track status change
    if (selectedStatus && selectedStatus !== complaint.status) {
      updates.status = selectedStatus;
      auditEntries.push({
        complaint_id: complaint.id,
        action: "status_changed",
        field_changed: "status",
        old_value: complaint.status,
        new_value: selectedStatus,
      });
    }

    // Track assignee change
    if ((selectedAssignee || null) !== (complaint.assigned_to || null)) {
      updates.assigned_to = selectedAssignee || null;
      auditEntries.push({
        complaint_id: complaint.id,
        action: "assigned",
        field_changed: "assigned_to",
        old_value: complaint.assigned_to,
        new_value: selectedAssignee || null,
      });
    }

    // Track workflow change
    const currentWorkflowId = (complaint as any).workflow_id || "";
    if (selectedWorkflowId !== currentWorkflowId) {
      updates.workflow_id = selectedWorkflowId || null;
      // If workflow changed, also set the first step and assign to its responsible
      if (selectedWorkflowId) {
        const selectedWorkflow = workflows?.find((w: Workflow) => w.id === selectedWorkflowId);
        const firstStep = selectedWorkflow?.steps?.sort((a, b) => a.step_order - b.step_order)?.[0];
        if (firstStep) {
          updates.current_workflow_step_id = firstStep.id;
          // Auto-assign to the responsible of the first step
          if (firstStep.responsible) {
            updates.assigned_to = firstStep.responsible.name;
            setSelectedAssignee(firstStep.responsible.name);
          }
        }
        // Set status to in analysis when workflow is assigned
        if (complaint.status === "novo") {
          updates.status = "em_analise";
          setSelectedStatus("em_analise");
        }
      } else {
        updates.current_workflow_step_id = null;
      }
      auditEntries.push({
        complaint_id: complaint.id,
        action: "workflow_changed",
        field_changed: "workflow_id",
        old_value: currentWorkflowId || null,
        new_value: selectedWorkflowId || null,
      });
    }

    // Track notes change
    if (internalNotes !== (complaint.internal_notes || "")) {
      updates.internal_notes = internalNotes || null;
      auditEntries.push({
        complaint_id: complaint.id,
        action: "notes_updated",
        field_changed: "internal_notes",
        old_value: complaint.internal_notes,
        new_value: internalNotes || null,
      });
    }

    if (Object.keys(updates).length === 0) {
      toast({ title: "Sem alterações", description: "Nenhuma alteração foi feita." });
      return;
    }

    try {
      await updateComplaint.mutateAsync({
        id: complaint.id,
        updates,
        auditEntries: auditEntries.length > 0 ? auditEntries : undefined,
      });

      toast({
        title: "Solicitação atualizada",
        description: `${auditEntries.length} alteração(ões) registrada(s) no histórico.`,
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!complaint) return null;

  const attachments = complaint.attachments as string[] | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono text-primary">
              {complaint.protocol_number}
            </span>
            <ComplaintTypeBadge type={complaint.type} />
            <ComplaintStatusBadge status={complaint.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Solicitante */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Solicitante
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>
                  {complaint.is_anonymous
                    ? "Anônimo"
                    : complaint.reporter_name || "Não informado"}
                </span>
              </div>
              {!complaint.is_anonymous && complaint.reporter_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{complaint.reporter_email}</span>
                </div>
              )}
              {!complaint.is_anonymous && complaint.reporter_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{complaint.reporter_phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(complaint.created_at), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Triagem IA */}
          <AITriageSection 
            complaint={complaint} 
            onRunTriage={() => {
              triageMutation.mutate({
                complaint_id: complaint.id,
                description: complaint.description,
                type: complaint.type,
                category: complaint.category,
                channel: (complaint as any).channel,
                reporter_name: complaint.reporter_name || undefined,
                is_anonymous: complaint.is_anonymous,
              });
            }}
            isTriaging={triageMutation.isPending}
          />

          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Detalhes
            </h3>
            <div className="space-y-3">
              {complaint.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{complaint.location}</span>
                </div>
              )}

              {complaint.occurred_at && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Ocorreu em:{" "}
                    {format(new Date(complaint.occurred_at), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground">Descrição</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                  {complaint.description}
                </p>
              </div>

              {complaint.involved_parties && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Pessoas/Setores Envolvidos
                  </Label>
                  <p className="mt-1 text-sm">{complaint.involved_parties}</p>
                </div>
              )}
            </div>
          </div>

          {/* Anexos */}
          {attachments && attachments.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Anexos ({attachments.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      Anexo {index + 1}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Reclassificação e Gerenciamento */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Classificação e Gerenciamento
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="visualizado">Visualizado</SelectItem>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                    <SelectItem value="resolvido">Resolvido</SelectItem>
                    <SelectItem value="fechado">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select
                  value={selectedAssignee || "unassigned"}
                  onValueChange={(v) =>
                    setSelectedAssignee(v === "unassigned" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Não atribuído" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Não atribuído</SelectItem>
                    {attendants?.map((attendant) => (
                      <SelectItem key={attendant.user_id} value={attendant.user_id}>
                        {attendant.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fluxo de Trabalho</Label>
              <Select
                value={selectedWorkflowId || "none"}
                onValueChange={(v) => setSelectedWorkflowId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum fluxo atribuído" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum fluxo atribuído</SelectItem>
                  {workflows?.filter((w: Workflow) => w.is_active).map((workflow: Workflow) => (
                    <SelectItem key={workflow.id} value={workflow.id}>
                      {workflow.name}
                      {workflow.workflow_type && (
                        <span className="text-muted-foreground ml-1">
                          ({workflow.workflow_type})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Workflow Progress Tracker */}
            {selectedWorkflowId && workflows && (
              <>
                <Separator />
                <WorkflowProgress complaint={complaint} workflows={workflows} />
              </>
            )}

            {/* Email History */}
            <Separator />
            <EmailHistoryPanel
              complaintId={complaint.id}
              complaintProtocol={complaint.protocol_number}
              responsibleEmail={
                workflows?.find((w: Workflow) => w.id === selectedWorkflowId)
                  ?.steps?.find((s) => s.id === complaint.current_workflow_step_id)
                  ?.responsible?.email
              }
              responsibleName={
                workflows?.find((w: Workflow) => w.id === selectedWorkflowId)
                  ?.steps?.find((s) => s.id === complaint.current_workflow_step_id)
                  ?.responsible?.name
              }
            />

            <div className="space-y-2">
              <Label>Notas Internas</Label>
              <Textarea
                placeholder="Adicione notas internas sobre esta solicitação..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Histórico de Alterações */}
          <div className="space-y-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 font-semibold text-sm text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
            >
              <History className="h-4 w-4" />
              Histórico de Alterações
              {auditLog && auditLog.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {auditLog.length}
                </Badge>
              )}
            </button>

            {showHistory && (
              <ScrollArea className="max-h-[200px]">
                {!auditLog || auditLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Nenhuma alteração registrada.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {auditLog.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 text-sm border-l-2 border-muted pl-3 py-1"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">
                            {actionLabels[entry.action] || entry.action}
                          </p>
                          {(entry.old_value || entry.new_value) && (
                            <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
                              {entry.field_changed && (
                                <span className="text-muted-foreground">{entry.field_changed}: </span>
                              )}
                              {entry.old_value && (
                                <>
                                  <span className="line-through">{entry.old_value}</span>
                                  <ArrowRight className="h-3 w-3" />
                                </>
                              )}
                              <span className="font-medium text-foreground">
                                {entry.new_value || "—"}
                              </span>
                            </div>
                          )}
                          {(entry as any).notes && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">
                              💬 {(entry as any).notes}
                            </p>
                          )}
                          {entry.user_email && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              por {entry.user_email}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(entry.created_at), "dd/MM HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveChanges}
              disabled={updateComplaint.isPending}
            >
              {updateComplaint.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
