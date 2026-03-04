import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ListOrdered } from "lucide-react";
import { SortableStep } from "./SortableStep";
import {
  Workflow,
  WorkflowStep,
  useWorkflowResponsibles,
  useCreateWorkflow,
  useUpdateWorkflow,
  useCreateStep,
  useUpdateStep,
  useDeleteStep,
  useReorderSteps,
} from "@/hooks/useWorkflows";

interface WorkflowEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow?: Workflow | null;
}

interface LocalStep extends Partial<WorkflowStep> {
  tempId?: string;
  isNew?: boolean;
}

export function WorkflowEditorModal({
  open,
  onOpenChange,
  workflow,
}: WorkflowEditorModalProps) {
  const { data: responsibles = [] } = useWorkflowResponsibles();

  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow();
  const createStep = useCreateStep();
  const updateStep = useUpdateStep();
  const deleteStep = useDeleteStep();
  const reorderSteps = useReorderSteps();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    workflow_type: "",
  });
  const [localSteps, setLocalSteps] = useState<LocalStep[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!workflow;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (workflow) {
      setFormData({
        name: workflow.name,
        description: workflow.description || "",
        workflow_type: workflow.workflow_type || "",
      });
      setLocalSteps(
        workflow.steps?.map((step) => ({
          ...step,
          isNew: false,
        })) || []
      );
    } else {
      setFormData({
        name: "",
        description: "",
        workflow_type: "",
      });
      setLocalSteps([]);
    }
  }, [workflow, open]);

  const handleAddStep = () => {
    const newStep: LocalStep = {
      tempId: `temp-${Date.now()}`,
      name: "",
      description: "",
      responsible_id: null,
      sla_days: 1,
      step_order: localSteps.length + 1,
      isNew: true,
      is_active: true,
    };
    setLocalSteps([...localSteps, newStep]);
  };

  const handleUpdateLocalStep = (id: string, updates: Partial<LocalStep>) => {
    setLocalSteps(
      localSteps.map((step) =>
        (step.id === id || step.tempId === id) ? { ...step, ...updates } : step
      )
    );
  };

  const handleDeleteLocalStep = (id: string) => {
    setLocalSteps(
      localSteps
        .filter((step) => step.id !== id && step.tempId !== id)
        .map((step, index) => ({ ...step, step_order: index + 1 }))
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalSteps((items) => {
        const oldIndex = items.findIndex(
          (item) => (item.id || item.tempId) === active.id
        );
        const newIndex = items.findIndex(
          (item) => (item.id || item.tempId) === over.id
        );

        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((item, index) => ({
          ...item,
          step_order: index + 1,
        }));
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let workflowId = workflow?.id;

      // Create or update the workflow
      if (isEditing && workflowId) {
        await updateWorkflow.mutateAsync({
          id: workflowId,
          ...formData,
          workflow_type: formData.workflow_type || undefined,
        });
      } else {
        const newWorkflow = await createWorkflow.mutateAsync({
          ...formData,
          workflow_type: formData.workflow_type || undefined,
        });
        workflowId = newWorkflow.id;
      }

      if (!workflowId) throw new Error("Workflow ID not available");

      // Handle steps
      const existingStepIds = workflow?.steps?.map((s) => s.id) || [];
      const currentStepIds = localSteps.filter((s) => s.id).map((s) => s.id!);

      // Delete removed steps
      const stepsToDelete = existingStepIds.filter(
        (id) => !currentStepIds.includes(id)
      );
      for (const stepId of stepsToDelete) {
        await deleteStep.mutateAsync({ id: stepId, workflowId });
      }

      // Create new steps and update existing ones
      for (const step of localSteps) {
        if (step.isNew) {
          await createStep.mutateAsync({
            workflow_id: workflowId,
            name: step.name || "",
            description: step.description || undefined,
            responsible_id: step.responsible_id || undefined,
            sla_days: step.sla_days || 1,
            step_order: step.step_order || 1,
          });
        } else if (step.id) {
          await updateStep.mutateAsync({
            id: step.id,
            name: step.name,
            description: step.description || undefined,
            responsible_id: step.responsible_id || undefined,
            sla_days: step.sla_days,
            step_order: step.step_order,
          });
        }
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving workflow:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? `Editar Fluxo: ${workflow?.name}` : "Novo Fluxo de Trabalho"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Atualize as informações e etapas do fluxo"
                : "Defina um novo fluxo de trabalho com suas etapas"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Fluxo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Fluxo de Reclamações"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="workflow_type">Tipo</Label>
              <Select
                value={formData.workflow_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, workflow_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reclamacao">Reclamação</SelectItem>
                  <SelectItem value="denuncia">Denúncia</SelectItem>
                  <SelectItem value="sugestao">Sugestão</SelectItem>
                  <SelectItem value="elogio">Elogio</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descreva o objetivo deste fluxo de trabalho"
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <ListOrdered className="h-4 w-4" />
                  Etapas do Fluxo
                </Label>
                <span className="text-xs text-muted-foreground">
                  Arraste para reordenar
                </span>
              </div>

              {localSteps.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={localSteps.map((s) => s.id || s.tempId || "")}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {localSteps.map((step, index) => (
                        <SortableStep
                          key={step.id || step.tempId}
                          step={step as WorkflowStep}
                          index={index}
                          responsibles={responsibles}
                          onUpdate={handleUpdateLocalStep}
                          onDelete={handleDeleteLocalStep}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="text-center py-6 bg-muted/50 rounded-lg border border-dashed">
                  <ListOrdered className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma etapa definida
                  </p>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={handleAddStep}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Etapa
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Salvando..." : isEditing ? "Salvar Fluxo" : "Criar Fluxo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
