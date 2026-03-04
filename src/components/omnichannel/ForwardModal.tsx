import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkflows, Workflow, WorkflowStep } from "@/hooks/useWorkflows";
import { ArrowRight, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const complaintTypes = [
  { value: "reclamacao", label: "Reclamação" },
  { value: "denuncia", label: "Denúncia" },
  { value: "sugestao", label: "Sugestão" },
  { value: "elogio", label: "Elogio" },
  { value: "duvida", label: "Dúvida" },
];

type ForwardModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onForward: (stepId: string, notes: string, summary?: string, complaintType?: string) => Promise<boolean>;
  conversationSummary?: string;
  currentComplaintType?: string;
};

export function ForwardModal({
  open,
  onOpenChange,
  onForward,
  conversationSummary,
  currentComplaintType,
}: ForwardModalProps) {
  const { data: workflows = [], isLoading: loadingWorkflows } = useWorkflows();
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [selectedType, setSelectedType] = useState(currentComplaintType || "");
  const [notes, setNotes] = useState("");
  const [isForwarding, setIsForwarding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleForward = async () => {
    if (!selectedStep) return;

    setIsForwarding(true);
    const success = await onForward(selectedStep.id, notes, conversationSummary, selectedType || undefined);
    setIsForwarding(false);

    if (success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onOpenChange(false);
        resetState();
      }, 2000);
    }
  };

  const resetState = () => {
    setSelectedWorkflow(null);
    setSelectedStep(null);
    setNotes("");
    setSelectedType(currentComplaintType || "");
  };

  const activeWorkflows = workflows.filter((w) => w.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Encaminhar Atendimento</DialogTitle>
          <DialogDescription>
            Altere o tipo se necessário e selecione o fluxo/etapa para encaminhar
          </DialogDescription>
        </DialogHeader>

        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Encaminhado com sucesso!</h3>
            <p className="text-muted-foreground">
              O caso foi encaminhado para {selectedStep?.name}
            </p>
          </div>
        ) : (
          <>
            {/* Tipo de solicitação */}
            <div>
              <Label className="mb-2 block">Tipo de Solicitação</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {complaintTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4">
              {/* Coluna de Fluxos */}
              <div className="flex flex-col">
                <Label className="mb-2">1. Selecione o Fluxo</Label>
                <ScrollArea className="flex-1 border rounded-lg p-2">
                  {loadingWorkflows ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : activeWorkflows.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum fluxo ativo disponível
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeWorkflows.map((workflow) => (
                        <div
                          key={workflow.id}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-colors",
                            selectedWorkflow?.id === workflow.id
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-accent"
                          )}
                          onClick={() => {
                            setSelectedWorkflow(workflow);
                            setSelectedStep(null);
                          }}
                        >
                          <h4 className="font-medium text-sm">{workflow.name}</h4>
                          {workflow.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {workflow.description}
                            </p>
                          )}
                          <Badge variant="outline" className="mt-2 text-xs">
                            {workflow.steps?.length || 0} etapas
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Coluna de Etapas */}
              <div className="flex flex-col">
                <Label className="mb-2">2. Selecione a Etapa</Label>
                <ScrollArea className="flex-1 border rounded-lg p-2">
                  {!selectedWorkflow ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      Selecione um fluxo primeiro
                    </div>
                  ) : !selectedWorkflow.steps?.length ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Este fluxo não possui etapas
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedWorkflow.steps
                        .sort((a, b) => a.step_order - b.step_order)
                        .map((step) => (
                          <div
                            key={step.id}
                            className={cn(
                              "p-3 rounded-lg border cursor-pointer transition-colors",
                              selectedStep?.id === step.id
                                ? "bg-primary/10 border-primary"
                                : "hover:bg-accent"
                            )}
                            onClick={() => setSelectedStep(step)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-muted text-xs font-medium">
                                {step.step_order + 1}
                              </span>
                              <h4 className="font-medium text-sm">{step.name}</h4>
                            </div>
                            {step.description && (
                              <p className="text-xs text-muted-foreground mt-1 ml-7 line-clamp-2">
                                {step.description}
                              </p>
                            )}
                            {step.responsible && (
                              <div className="mt-2 ml-7">
                                <Badge variant="secondary" className="text-xs">
                                  {step.responsible.name}
                                </Badge>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            {/* Área de Observações */}
            <div className="mt-4">
              <Label htmlFor="notes" className="mb-2 block">
                Observações para o próximo atendente
              </Label>
              <Textarea
                id="notes"
                placeholder="Descreva o contexto do atendimento, ações já realizadas, e informações importantes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Resumo IA */}
            {conversationSummary && (
              <div className="mt-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <div className="flex items-center gap-2 text-primary text-sm font-medium mb-1">
                  <Sparkles className="h-4 w-4" />
                  Resumo gerado por IA
                </div>
                <p className="text-sm text-muted-foreground">{conversationSummary}</p>
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleForward}
                disabled={!selectedStep || isForwarding}
              >
                {isForwarding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Encaminhando...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Encaminhar
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
