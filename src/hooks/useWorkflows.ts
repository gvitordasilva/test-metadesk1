import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
export interface WorkflowResponsible {
  id: string;
  name: string;
  position: string;
  department: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  name: string;
  description: string | null;
  responsible_id: string | null;
  sla_days: number;
  step_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  responsible?: WorkflowResponsible;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  workflow_type: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  steps?: WorkflowStep[];
}

// Input types
export interface CreateResponsibleInput {
  name: string;
  position: string;
  department: string;
  email: string;
  phone?: string;
  is_active?: boolean;
}

export interface UpdateResponsibleInput extends Partial<CreateResponsibleInput> {
  id: string;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  workflow_type?: string;
  is_active?: boolean;
}

export interface UpdateWorkflowInput extends Partial<CreateWorkflowInput> {
  id: string;
}

export interface CreateStepInput {
  workflow_id: string;
  name: string;
  description?: string;
  responsible_id?: string;
  sla_days?: number;
  step_order: number;
}

export interface UpdateStepInput extends Partial<Omit<CreateStepInput, 'workflow_id'>> {
  id: string;
}

// ============ RESPONSIBLES HOOKS ============

export function useWorkflowResponsibles() {
  return useQuery({
    queryKey: ["workflow-responsibles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_responsibles")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as WorkflowResponsible[];
    },
  });
}

export function useCreateResponsible() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateResponsibleInput) => {
      const { data, error } = await supabase
        .from("workflow_responsibles")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as WorkflowResponsible;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-responsibles"] });
      toast.success("Responsável cadastrado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating responsible:", error);
      toast.error("Erro ao cadastrar responsável");
    },
  });
}

export function useUpdateResponsible() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateResponsibleInput) => {
      const { data, error } = await supabase
        .from("workflow_responsibles")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as WorkflowResponsible;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-responsibles"] });
      toast.success("Responsável atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating responsible:", error);
      toast.error("Erro ao atualizar responsável");
    },
  });
}

export function useDeleteResponsible() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workflow_responsibles")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-responsibles"] });
      toast.success("Responsável removido com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting responsible:", error);
      toast.error("Erro ao remover responsável");
    },
  });
}

// ============ WORKFLOWS HOOKS ============

export function useWorkflows() {
  return useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflows")
        .select(`
          *,
          steps:workflow_steps(
            *,
            responsible:workflow_responsibles(*)
          )
        `)
        .order("name");

      if (error) throw error;
      
      // Sort steps by step_order
      return (data as Workflow[]).map(workflow => ({
        ...workflow,
        steps: workflow.steps?.sort((a, b) => a.step_order - b.step_order) || []
      }));
    },
  });
}

export function useWorkflow(id: string | null) {
  return useQuery({
    queryKey: ["workflow", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("workflows")
        .select(`
          *,
          steps:workflow_steps(
            *,
            responsible:workflow_responsibles(*)
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        steps: data.steps?.sort((a: WorkflowStep, b: WorkflowStep) => a.step_order - b.step_order) || []
      } as Workflow;
    },
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWorkflowInput) => {
      const { data, error } = await supabase
        .from("workflows")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as Workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Fluxo de trabalho criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating workflow:", error);
      toast.error("Erro ao criar fluxo de trabalho");
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateWorkflowInput) => {
      const { data, error } = await supabase
        .from("workflows")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Workflow;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow", variables.id] });
      toast.success("Fluxo de trabalho atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating workflow:", error);
      toast.error("Erro ao atualizar fluxo de trabalho");
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workflows")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Fluxo de trabalho removido com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting workflow:", error);
      toast.error("Erro ao remover fluxo de trabalho");
    },
  });
}

// ============ WORKFLOW STEPS HOOKS ============

export function useCreateStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStepInput) => {
      const { data, error } = await supabase
        .from("workflow_steps")
        .insert(input)
        .select(`
          *,
          responsible:workflow_responsibles(*)
        `)
        .single();

      if (error) throw error;
      return data as WorkflowStep;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow", data.workflow_id] });
    },
    onError: (error) => {
      console.error("Error creating step:", error);
      toast.error("Erro ao adicionar etapa");
    },
  });
}

export function useUpdateStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateStepInput) => {
      const { data, error } = await supabase
        .from("workflow_steps")
        .update(input)
        .eq("id", id)
        .select(`
          *,
          responsible:workflow_responsibles(*)
        `)
        .single();

      if (error) throw error;
      return data as WorkflowStep;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow", data.workflow_id] });
    },
    onError: (error) => {
      console.error("Error updating step:", error);
      toast.error("Erro ao atualizar etapa");
    },
  });
}

export function useDeleteStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, workflowId }: { id: string; workflowId: string }) => {
      const { error } = await supabase
        .from("workflow_steps")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { workflowId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow", data.workflowId] });
    },
    onError: (error) => {
      console.error("Error deleting step:", error);
      toast.error("Erro ao remover etapa");
    },
  });
}

export function useReorderSteps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ steps, workflowId }: { steps: { id: string; step_order: number }[]; workflowId: string }) => {
      // Update all steps in parallel
      await Promise.all(
        steps.map(({ id, step_order }) =>
          supabase
            .from("workflow_steps")
            .update({ step_order })
            .eq("id", id)
        )
      );
      return { workflowId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow", data.workflowId] });
    },
    onError: (error) => {
      console.error("Error reordering steps:", error);
      toast.error("Erro ao reordenar etapas");
    },
  });
}
