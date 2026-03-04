import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type QuickMessage = {
  id: string;
  title: string;
  content: string;
  category: string;
  shortcut: string | null;
  is_active: boolean;
  created_at: string;
};

export function useQuickMessages() {
  const [messages, setMessages] = useState<QuickMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("quick_messages")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("title", { ascending: true });

      if (error) throw error;

      setMessages(data as QuickMessage[]);
    } catch (error) {
      console.error("Erro ao buscar mensagens rápidas:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const getByCategory = useCallback(
    (category: string): QuickMessage[] => {
      return messages.filter((msg) => msg.category === category);
    },
    [messages]
  );

  const getByShortcut = useCallback(
    (shortcut: string): QuickMessage | undefined => {
      return messages.find((msg) => msg.shortcut === shortcut);
    },
    [messages]
  );

  const categories = Array.from(new Set(messages.map((msg) => msg.category)));

  return {
    messages,
    categories,
    isLoading,
    refetch: fetchMessages,
    getByCategory,
    getByShortcut,
  };
}
