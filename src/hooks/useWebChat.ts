import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ChatMessage = {
  id: string;
  content: string;
  sender: "bot" | "user" | "agent";
  timestamp: Date;
  options?: { key: string; text: string; nextNodeId: string | null }[];
};

type ChatbotNode = {
  id: string;
  flow_id: string;
  node_type: string;
  name: string;
  content: string | null;
  options: any;
  action_type: string;
  action_config: any;
  next_node_id: string | null;
  is_entry_point: boolean;
  is_active: boolean;
};

type NodeOption = {
  id: string;
  node_id: string;
  option_key: string;
  option_text: string;
  next_node_id: string | null;
  option_order: number;
};

// Helper to call the chatbot-public edge function
async function callPublicApi<T>(action: string, params: Record<string, any> = {}): Promise<T | null> {
  const { data, error } = await supabase.functions.invoke("chatbot-public", {
    body: { action, ...params },
  });

  if (error) {
    console.error(`[chatbot-public] ${action} error:`, error);
    return null;
  }

  if (!data.ok) {
    console.error(`[chatbot-public] ${action} failed:`, data);
    return null;
  }

  return data.data as T;
}

export function useWebChat(flowId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);
  const [isLiveChat, setIsLiveChat] = useState(false);
  const [queueItemId, setQueueItemId] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPollTimestampRef = useRef<string>(new Date().toISOString());

  const addMessage = useCallback((content: string, sender: "bot" | "user" | "agent", options?: ChatMessage["options"]) => {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      content,
      sender,
      timestamp: new Date(),
      options,
    };
    setMessages((prev) => [...prev, message]);
    return message;
  }, []);

  // Poll for new messages from agent during live chat
  const pollMessages = useCallback(async (qId: string) => {
    try {
      const result = await callPublicApi<{
        messages: Array<{ id: string; content: string; sender_type: string; created_at: string }>;
        queueStatus: string | null;
      }>("getNewMessages", {
        queueId: qId,
        afterTimestamp: lastPollTimestampRef.current,
      });

      if (!result) return;

      if (result.messages && result.messages.length > 0) {
        result.messages.forEach((msg) => {
          const sender = msg.sender_type === "agent" ? "agent" : "bot";
          setMessages((prev) => {
            // Deduplicate by checking content+timestamp
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [
              ...prev,
              {
                id: msg.id,
                content: msg.content,
                sender,
                timestamp: new Date(msg.created_at),
              },
            ];
          });
        });
        // Update poll timestamp to the latest message
        const latest = result.messages[result.messages.length - 1];
        lastPollTimestampRef.current = latest.created_at;
      }

      // If queue completed, end the chat
      if (result.queueStatus === "completed") {
        setIsEnded(true);
        setIsLiveChat(false);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch (err) {
      console.error("Poll error:", err);
    }
  }, []);

  // Start polling when entering live chat mode
  useEffect(() => {
    if (isLiveChat && queueItemId) {
      // Initial poll
      pollMessages(queueItemId);
      // Poll every 3 seconds
      pollingRef.current = setInterval(() => pollMessages(queueItemId), 3000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isLiveChat, queueItemId, pollMessages]);

  // Escalate: create queue entry and switch to live chat mode
  const escalateToLiveChat = useCallback(async () => {
    try {
      // Collect chat history to save for the attendant
      const chatHistory = messages.map((m) => ({
        content: m.content,
        sender: m.sender,
        timestamp: m.timestamp.toISOString(),
      }));

      const result = await callPublicApi<{ queueId: string }>("createQueueEntry", {
        flowId,
        chatHistory,
        subject: "Atendimento via webchat",
      });

      if (result?.queueId) {
        setQueueItemId(result.queueId);
        lastPollTimestampRef.current = new Date().toISOString();
        setIsLiveChat(true);
        setIsEscalated(false); // No longer "waiting" — now in live mode
      } else {
        console.error("Failed to create queue entry");
      }
    } catch (err) {
      console.error("Escalation error:", err);
    }
  }, [messages, flowId]);

  const processNode = useCallback(async (node: ChatbotNode) => {
    // Handle action nodes
    if (node.node_type === "action") {
      if (node.action_type === "escalate") {
        addMessage(
          node.content || "Transferindo para um atendente. Aguarde um momento...",
          "bot"
        );
        setIsEscalated(true);
        setCurrentNodeId(null);
        return;
      }

      if (node.action_type === "end") {
        addMessage(node.content || "Obrigado pelo contato. Até logo!", "bot");
        setIsEnded(true);
        setCurrentNodeId(null);
        return;
      }
    }

    // For menu nodes, get options
    if (node.node_type === "menu") {
      const nodeOptions = await callPublicApi<NodeOption[]>("getNodeOptions", { nodeId: node.id });

      const options = nodeOptions?.map((opt) => ({
        key: opt.option_key,
        text: opt.option_text,
        nextNodeId: opt.next_node_id,
      })) || [];

      addMessage(node.content || "", "bot", options);
      setCurrentNodeId(node.id);
      return;
    }

    // For message nodes
    if (node.content) {
      addMessage(node.content, "bot");
    }

    // If there's a next node, process it after a short delay
    if (node.next_node_id) {
      setCurrentNodeId(node.next_node_id);
      setTimeout(async () => {
        const nextNode = await callPublicApi<ChatbotNode>("getNode", { nodeId: node.next_node_id });
        if (nextNode) {
          await processNode(nextNode);
        }
      }, 500);
    } else {
      setCurrentNodeId(node.id);
    }
  }, [addMessage]);

  const startChat = useCallback(async () => {
    setIsLoading(true);
    try {
      const entryNode = await callPublicApi<ChatbotNode>("getEntryNode", { flowId });

      if (!entryNode) {
        addMessage(
          "Olá! Bem-vindo ao atendimento. No momento não há um fluxo configurado.",
          "bot"
        );
        return;
      }

      await processNode(entryNode);
    } catch (error) {
      console.error("Error starting chat:", error);
      addMessage("Erro ao iniciar o chat. Por favor, tente novamente.", "bot");
    } finally {
      setIsLoading(false);
    }
  }, [flowId, addMessage, processNode]);

  const selectOption = useCallback(async (optionKey: string, nextNodeId: string | null) => {
    addMessage(optionKey, "user");

    if (!nextNodeId) {
      addMessage("Transferindo para um atendente. Aguarde um momento...", "bot");
      setIsEscalated(true);
      setCurrentNodeId(null);
      return;
    }

    setIsLoading(true);
    try {
      const nextNode = await callPublicApi<ChatbotNode>("getNode", { nodeId: nextNodeId });

      if (!nextNode) {
        addMessage("Transferindo para um atendente. Aguarde um momento...", "bot");
        setIsEscalated(true);
        setCurrentNodeId(null);
        return;
      }

      await processNode(nextNode);
    } catch (error) {
      console.error("Error processing option:", error);
      addMessage("Erro ao processar sua escolha. Tente novamente.", "bot");
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, processNode]);

  const sendMessage = useCallback(async (text: string) => {
    addMessage(text, "user");

    // If in live chat mode, send via edge function to service_messages
    if (isLiveChat && queueItemId) {
      setIsLoading(true);
      try {
        await callPublicApi("sendCustomerMessage", {
          queueId: queueItemId,
          content: text,
        });
      } catch (err) {
        console.error("Error sending live message:", err);
        addMessage("Erro ao enviar mensagem. Tente novamente.", "bot");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // For non-menu contexts, try to match with current options or escalate
    if (!currentNodeId) {
      addMessage("Por favor, aguarde o atendimento ou selecione uma opção.", "bot");
      return;
    }

    setIsLoading(true);
    try {
      const currentNode = await callPublicApi<ChatbotNode>("getNode", { nodeId: currentNodeId });

      if (currentNode?.node_type === "menu") {
        const nodeOptions = await callPublicApi<NodeOption[]>("getNodeOptions", { nodeId: currentNodeId });

        const matchedOption = nodeOptions?.find(
          (opt) =>
            opt.option_key === text.trim() ||
            opt.option_text.toLowerCase().includes(text.toLowerCase())
        );

        if (matchedOption) {
          await selectOption(matchedOption.option_key, matchedOption.next_node_id);
        } else {
          addMessage("Opção inválida. Por favor, escolha uma das opções disponíveis.", "bot");
        }
      } else if (currentNode?.next_node_id) {
        const nextNode = await callPublicApi<ChatbotNode>("getNode", { nodeId: currentNode.next_node_id });
        if (nextNode) {
          await processNode(nextNode);
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
      addMessage("Erro ao processar sua mensagem. Tente novamente.", "bot");
    } finally {
      setIsLoading(false);
    }
  }, [currentNodeId, isLiveChat, queueItemId, addMessage, selectOption, processNode]);

  return {
    messages,
    isLoading,
    isEnded,
    isEscalated,
    isLiveChat,
    queueItemId,
    startChat,
    selectOption,
    sendMessage,
    escalateToLiveChat,
  };
}
