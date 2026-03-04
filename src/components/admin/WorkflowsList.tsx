import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, GitBranch, Users, Clock, Pencil, Trash2 } from "lucide-react";
import { useWorkflows, useDeleteWorkflow, Workflow } from "@/hooks/useWorkflows";
import { WorkflowEditorModal } from "./WorkflowEditorModal";

const typeLabels: Record<string, string> = {
  reclamacao: "Reclamação",
  denuncia: "Denúncia",
  sugestao: "Sugestão",
  elogio: "Elogio",
  outro: "Outro",
};

const typeColors: Record<string, string> = {
  reclamacao: "bg-red-100 text-red-800",
  denuncia: "bg-orange-100 text-orange-800",
  sugestao: "bg-blue-100 text-blue-800",
  elogio: "bg-green-100 text-green-800",
  outro: "bg-gray-100 text-gray-800",
};

export function WorkflowsList() {
  const { data: workflows, isLoading } = useWorkflows();
  const deleteWorkflow = useDeleteWorkflow();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(null);

  const handleEdit = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setModalOpen(true);
  };

  const handleDelete = (workflow: Workflow) => {
    setWorkflowToDelete(workflow);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (workflowToDelete) {
      await deleteWorkflow.mutateAsync(workflowToDelete.id);
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
    }
  };

  const handleAddNew = () => {
    setSelectedWorkflow(null);
    setModalOpen(true);
  };

  const getTotalSla = (workflow: Workflow) => {
    return workflow.steps?.reduce((acc, step) => acc + (step.sla_days || 0), 0) || 0;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Fluxos de Trabalho</CardTitle>
            <CardDescription>
              Defina os caminhos que as solicitações podem seguir
            </CardDescription>
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Fluxo
          </Button>
        </CardHeader>
        <CardContent>
          {workflows && workflows.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((workflow) => (
                <Card
                  key={workflow.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">{workflow.name}</CardTitle>
                      </div>
                      {workflow.workflow_type && (
                        <Badge
                          className={typeColors[workflow.workflow_type] || typeColors.outro}
                        >
                          {typeLabels[workflow.workflow_type] || workflow.workflow_type}
                        </Badge>
                      )}
                    </div>
                    {workflow.description && (
                      <CardDescription className="text-xs line-clamp-2">
                        {workflow.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {workflow.steps?.length || 0} etapas
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {getTotalSla(workflow)} dias (SLA)
                      </span>
                    </div>

                    {workflow.steps && workflow.steps.length > 0 && (
                      <div className="space-y-1 mb-4">
                        {workflow.steps.slice(0, 3).map((step, index) => (
                          <div
                            key={step.id}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-medium">
                              {index + 1}
                            </span>
                            <span className="truncate">{step.name}</span>
                          </div>
                        ))}
                        {workflow.steps.length > 3 && (
                          <span className="text-xs text-muted-foreground ml-6">
                            +{workflow.steps.length - 3} mais
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEdit(workflow)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(workflow)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum fluxo de trabalho definido</p>
              <p className="text-sm">Clique em "Novo Fluxo" para criar o primeiro</p>
            </div>
          )}
        </CardContent>
      </Card>

      <WorkflowEditorModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        workflow={selectedWorkflow}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Fluxo de Trabalho</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o fluxo "{workflowToDelete?.name}"? Todas as etapas
              serão removidas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
