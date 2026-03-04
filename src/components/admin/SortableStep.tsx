import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GripVertical, Trash2 } from "lucide-react";
import { WorkflowStep, WorkflowResponsible } from "@/hooks/useWorkflows";

interface LocalStep extends Partial<WorkflowStep> {
  tempId?: string;
  isNew?: boolean;
}

interface SortableStepProps {
  step: LocalStep;
  index: number;
  responsibles: WorkflowResponsible[];
  onUpdate: (id: string, updates: Partial<LocalStep>) => void;
  onDelete: (id: string) => void;
}

export function SortableStep({
  step,
  index,
  responsibles,
  onUpdate,
  onDelete,
}: SortableStepProps) {
  // Identificador único: usa id para etapas existentes ou tempId para novas
  const stepId = step.id || step.tempId || "";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stepId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-muted/50 rounded-lg border ${
        isDragging ? "border-primary shadow-lg" : "border-transparent"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      <span className="text-sm font-medium text-muted-foreground w-6">
        {index + 1}.
      </span>

      <Input
        value={step.name || ""}
        onChange={(e) => onUpdate(stepId, { name: e.target.value })}
        placeholder="Nome da etapa"
        className="flex-1"
      />

      <Select
        value={step.responsible_id || "unassigned"}
        onValueChange={(value) =>
          onUpdate(stepId, {
            responsible_id: value === "unassigned" ? null : value,
          })
        }
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Sem responsável</SelectItem>
          {responsibles
            .filter((r) => r.is_active)
            .map((responsible) => (
              <SelectItem key={responsible.id} value={responsible.id}>
                {responsible.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          value={step.sla_days || 1}
          onChange={(e) =>
            onUpdate(stepId, { sla_days: parseInt(e.target.value) || 1 })
          }
          className="w-16 text-center"
        />
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {step.sla_days === 1 ? "dia" : "dias"}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(stepId)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
