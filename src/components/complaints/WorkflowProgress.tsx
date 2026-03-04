import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Loader2,
  Mail,
  User,
  Clock,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Workflow, WorkflowStep } from "@/hooks/useWorkflows";

interface WorkflowProgressProps {
  complaint: any;
  workflows: Workflow[];
}

export function WorkflowProgress({ complaint, workflows }: WorkflowProgressProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [showConcludeDialog, setShowConcludeDialog] = useState(false);
  const [resolutionMessage, setResolutionMessage] = useState("");
  const [isConcluding, setIsConcluding] = useState(false);

  const workflowId = complaint.workflow_id;
  const currentStepId = complaint.current_workflow_step_id;

  if (!workflowId) return null;

  const workflow = workflows?.find((w: Workflow) => w.id === workflowId);
  if (!workflow || !workflow.steps?.length) return null;

  const sortedSteps = [...workflow.steps].sort((a, b) => a.step_order - b.step_order);
  const currentStepIndex = sortedSteps.findIndex((s) => s.id === currentStepId);
  const currentStep = currentStepIndex >= 0 ? sortedSteps[currentStepIndex] : null;
  const isLastStep = currentStepIndex === sortedSteps.length - 1;
  const nextStep = !isLastStep && currentStepIndex >= 0 ? sortedSteps[currentStepIndex + 1] : null;

  const handleAdvanceStep = async () => {
    if (!nextStep) return;
    setIsAdvancing(true);

    try {
      // Update complaint to next step
      const updates: Record<string, any> = {
        current_workflow_step_id: nextStep.id,
        status: "em_analise",
      };

      // If the next step has a responsible, update assigned_to with their name
      if (nextStep.responsible) {
        updates.assigned_to = nextStep.responsible.name;
      }

      const { error } = await supabase
        .from("complaints")
        .update(updates)
        .eq("id", complaint.id);

      if (error) throw error;

      // Add audit log
      await supabase.from("complaint_audit_log" as any).insert({
        complaint_id: complaint.id,
        action: "workflow_step_advanced",
        field_changed: "current_workflow_step_id",
        old_value: currentStep?.name || null,
        new_value: nextStep.name,
      });

      // Send email notification to the next step's responsible
      if (nextStep.responsible?.email) {
        try {
          await supabase.functions.invoke("send-workflow-email", {
            body: {
              complaint_id: complaint.id,
              to_email: nextStep.responsible.email,
              to_name: nextStep.responsible.name,
              body_html: `
                <p>Olá <strong>${nextStep.responsible.name}</strong>,</p>
                <p>Uma solicitação foi encaminhada para sua etapa no fluxo de trabalho:</p>
                <ul>
                  <li><strong>Etapa:</strong> ${nextStep.name}</li>
                  <li><strong>Fluxo:</strong> ${workflow.name}</li>
                  <li><strong>Etapa anterior:</strong> ${currentStep?.name || "—"}</li>
                </ul>
                <p>${complaint.description ? `<strong>Descrição:</strong> ${complaint.description.substring(0, 300)}${complaint.description.length > 300 ? "..." : ""}` : ""}</p>
                <p>Acesse a plataforma para dar continuidade ao atendimento.</p>
              `,
            },
          });
        } catch (emailErr) {
          console.error("Error sending workflow email:", emailErr);
        }
      }

      toast({
        title: "Etapa avançada",
        description: `Encaminhado para: ${nextStep.name}${nextStep.responsible ? ` (${nextStep.responsible.name})` : ""}`,
      });

      queryClient.invalidateQueries({ queryKey: ["complaint", complaint.id] });
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
    } catch (error) {
      console.error("Error advancing step:", error);
      toast({ title: "Erro", description: "Não foi possível avançar a etapa.", variant: "destructive" });
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleConclude = async () => {
    if (!resolutionMessage.trim()) {
      toast({ title: "Resposta obrigatória", description: "Escreva uma resposta para o solicitante.", variant: "destructive" });
      return;
    }

    setIsConcluding(true);
    try {
      // Update complaint status to resolved
      const { error } = await supabase
        .from("complaints")
        .update({
          status: "resolvido",
          internal_notes: [complaint.internal_notes, `[CONCLUSÃO] ${resolutionMessage}`].filter(Boolean).join("\n\n"),
        })
        .eq("id", complaint.id);

      if (error) throw error;

      // Add audit log
      await supabase.from("complaint_audit_log" as any).insert({
        complaint_id: complaint.id,
        action: "concluded",
        field_changed: "status",
        old_value: complaint.status,
        new_value: "resolvido",
      });

      // Send resolution email if reporter is not anonymous
      if (!complaint.is_anonymous && complaint.reporter_email) {
        try {
          await supabase.functions.invoke("complaint-resolution-email", {
            body: {
              protocolNumber: complaint.protocol_number,
              email: complaint.reporter_email,
              name: complaint.reporter_name,
              type: complaint.type,
              category: complaint.category,
              resolutionMessage: resolutionMessage,
              responsibleName: currentStep?.responsible?.name || null,
            },
          });
          toast({
            title: "Solicitação concluída",
            description: "O solicitante foi notificado por e-mail.",
          });
        } catch (emailError) {
          console.error("Email error:", emailError);
          toast({
            title: "Solicitação concluída",
            description: "Concluída, mas houve erro ao enviar o e-mail.",
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Solicitação concluída",
          description: complaint.is_anonymous ? "Solicitação anônima — sem e-mail enviado." : "Concluída com sucesso.",
        });
      }

      setShowConcludeDialog(false);
      setResolutionMessage("");
      queryClient.invalidateQueries({ queryKey: ["complaint", complaint.id] });
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
    } catch (error) {
      console.error("Error concluding:", error);
      toast({ title: "Erro", description: "Não foi possível concluir a solicitação.", variant: "destructive" });
    } finally {
      setIsConcluding(false);
    }
  };

  return (
    <>
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Progresso do Fluxo: {workflow.name}
        </h3>

        {/* Step progress indicator */}
        <div className="space-y-1">
          {sortedSteps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isPending = index > currentStepIndex;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  isCurrent && "bg-primary/5 border-primary/30",
                  isCompleted && "bg-muted/50 border-muted",
                  isPending && "opacity-50"
                )}
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : isCurrent ? (
                    <div className="h-5 w-5 rounded-full border-2 border-primary bg-primary/20 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-medium", isCompleted && "line-through text-muted-foreground")}>
                      {step.name}
                    </span>
                    {index === sortedSteps.length - 1 && (
                      <Badge variant="outline" className="text-[10px]">Última etapa</Badge>
                    )}
                  </div>
                  {step.responsible && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{step.responsible.name}</span>
                      {step.responsible.email && (
                        <>
                          <Mail className="h-3 w-3 text-muted-foreground ml-2" />
                          <span className="text-xs text-muted-foreground">{step.responsible.email}</span>
                        </>
                      )}
                    </div>
                  )}
                  {step.sla_days > 0 && (
                    <span className="text-[10px] text-muted-foreground">SLA: {step.sla_days} dia(s)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        {complaint.status !== "resolvido" && complaint.status !== "fechado" && (
          <div className="flex gap-2 pt-2">
            {!isLastStep && nextStep && (
              <Button
                onClick={handleAdvanceStep}
                disabled={isAdvancing}
                variant="outline"
                className="flex-1 gap-2"
              >
                {isAdvancing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Avançar para: {nextStep.name}
                {nextStep.responsible && (
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    {nextStep.responsible.name}
                  </Badge>
                )}
              </Button>
            )}

            {isLastStep && (
              <Button
                onClick={() => setShowConcludeDialog(true)}
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Concluir Solicitação
              </Button>
            )}
          </div>
        )}

        {complaint.status === "resolvido" && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950/20 dark:border-green-900">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">Solicitação concluída</span>
          </div>
        )}
      </div>

      {/* Conclusion Dialog */}
      <Dialog open={showConcludeDialog} onOpenChange={setShowConcludeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Concluir Solicitação
            </DialogTitle>
            <DialogDescription>
              Escreva a resposta final que será enviada por e-mail ao solicitante.
              {complaint.is_anonymous && (
                <span className="block mt-1 text-yellow-600 dark:text-yellow-400">
                  ⚠️ Solicitação anônima — nenhum e-mail será enviado.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
              <p><strong>Protocolo:</strong> {complaint.protocol_number}</p>
              <p><strong>Solicitante:</strong> {complaint.is_anonymous ? "Anônimo" : complaint.reporter_name}</p>
              {!complaint.is_anonymous && complaint.reporter_email && (
                <p className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  <strong>E-mail:</strong> {complaint.reporter_email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolution">Resposta ao solicitante *</Label>
              <Textarea
                id="resolution"
                placeholder="Descreva a resolução, as providências tomadas e a resposta final para o solicitante..."
                value={resolutionMessage}
                onChange={(e) => setResolutionMessage(e.target.value)}
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConcludeDialog(false)} disabled={isConcluding}>
              Cancelar
            </Button>
            <Button
              onClick={handleConclude}
              disabled={isConcluding || !resolutionMessage.trim()}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {isConcluding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isConcluding ? "Concluindo..." : "Concluir e Enviar E-mail"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
