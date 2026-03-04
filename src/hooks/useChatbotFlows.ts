import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ChatbotFlow = {
  id: string;
  name: string;
  description: string | null;
  channel: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type ChatbotNode = {
  id: string;
  flow_id: string;
  node_type: "message" | "menu" | "input" | "action" | "condition";
  name: string;
  content: string | null;
  options: any;
  action_type: "none" | "escalate" | "transfer" | "end" | "goto";
  action_config: any;
  next_node_id: string | null;
  node_order: number;
  is_entry_point: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ChatbotNodeOption = {
  id: string;
  node_id: string;
  option_key: string;
  option_text: string;
  next_node_id: string | null;
  option_order: number;
  created_at: string;
};

// Helper function to call the admin Edge Function
async function callAdminApi<T>(action: string, params: Record<string, any> = {}): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const { data, error } = await supabase.functions.invoke("chatbot-admin", {
    body: { action, ...params },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (error) {
    console.error("[callAdminApi] Function invoke error:", error);
    throw new Error(error.message || "Erro ao chamar API");
  }

  if (!data?.ok) {
    console.error("[callAdminApi] API error:", data);
    throw new Error(data?.error || "Erro na operação");
  }

  return data.data as T;
}

// ============ FLOWS ============

export function useChatbotFlows() {
  return useQuery({
    queryKey: ["chatbot-flows"],
    queryFn: async () => {
      return callAdminApi<ChatbotFlow[]>("listFlows");
    },
  });
}

export function useCreateChatbotFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flow: Partial<ChatbotFlow>) => {
      return callAdminApi<ChatbotFlow>("createFlow", {
        name: flow.name || "Novo Fluxo",
        description: flow.description || null,
        channel: flow.channel || "all",
        is_active: flow.is_active ?? true,
        is_default: flow.is_default ?? false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-flows"] });
    },
  });
}

export function useUpdateChatbotFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChatbotFlow> & { id: string }) => {
      return callAdminApi<ChatbotFlow>("updateFlow", { id, ...updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-flows"] });
    },
  });
}

export function useDeleteChatbotFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await callAdminApi("deleteFlow", { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-flows"] });
    },
  });
}

// ============ NODES ============

export function useChatbotNodes(flowId: string | null) {
  return useQuery({
    queryKey: ["chatbot-nodes", flowId],
    queryFn: async () => {
      if (!flowId) return [];
      return callAdminApi<ChatbotNode[]>("listNodes", { flowId });
    },
    enabled: !!flowId,
  });
}

export function useCreateChatbotNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (node: Partial<ChatbotNode>) => {
      return callAdminApi<ChatbotNode>("createNode", {
        flow_id: node.flow_id,
        node_type: node.node_type || "message",
        name: node.name || "Novo Nó",
        content: node.content || null,
        options: node.options || null,
        action_type: node.action_type || "none",
        action_config: node.action_config || null,
        next_node_id: node.next_node_id || null,
        node_order: node.node_order ?? 0,
        is_entry_point: node.is_entry_point ?? false,
        is_active: node.is_active ?? true,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-nodes", data.flow_id] });
    },
  });
}

export function useUpdateChatbotNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChatbotNode> & { id: string }) => {
      return callAdminApi<ChatbotNode>("updateNode", { id, ...updates });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-nodes", data.flow_id] });
    },
  });
}

export function useDeleteChatbotNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, flowId }: { id: string; flowId: string }) => {
      await callAdminApi("deleteNode", { id });
      return { flowId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-nodes", data.flowId] });
    },
  });
}

export function useBulkUpdateNodes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nodes: { id: string; node_order: number }[]) => {
      await callAdminApi("bulkUpdateNodeOrder", { nodes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-nodes"] });
    },
  });
}

// ============ NODE OPTIONS ============

export function useChatbotNodeOptions(nodeId: string | null) {
  return useQuery({
    queryKey: ["chatbot-node-options", nodeId],
    queryFn: async () => {
      if (!nodeId) return [];
      return callAdminApi<ChatbotNodeOption[]>("listNodeOptions", { nodeId });
    },
    enabled: !!nodeId,
  });
}

export function useCreateNodeOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (option: Partial<ChatbotNodeOption>) => {
      return callAdminApi<ChatbotNodeOption>("createNodeOption", {
        node_id: option.node_id,
        option_key: option.option_key || "1",
        option_text: option.option_text || "Nova Opção",
        next_node_id: option.next_node_id || null,
        option_order: option.option_order ?? 0,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-node-options", data.node_id] });
    },
  });
}

export function useUpdateNodeOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChatbotNodeOption> & { id: string }) => {
      return callAdminApi<ChatbotNodeOption>("updateNodeOption", { id, ...updates });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-node-options", data.node_id] });
    },
  });
}

export function useDeleteNodeOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, nodeId }: { id: string; nodeId: string }) => {
      await callAdminApi("deleteNodeOption", { id });
      return { nodeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-node-options", data.nodeId] });
    },
  });
}
