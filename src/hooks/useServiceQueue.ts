import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ServiceQueueChannel = "web" | "voice" | "whatsapp" | "email" | "chat" | "phone";
export type ServiceQueueStatus = "waiting" | "in_progress" | "completed" | "forwarded";

export type ServiceQueueItem = {
  id: string;
  channel: ServiceQueueChannel;
  status: ServiceQueueStatus;
  priority: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_avatar: string | null;
  subject: string | null;
  last_message: string | null;
  unread_count: number;
  complaint_id: string | null;
  voice_session_id: string | null;
  assigned_to: string | null;
  waiting_since: string;
  created_at: string;
  updated_at: string;
};

export type QueueFilters = {
  channel?: ServiceQueueChannel;
  status?: ServiceQueueStatus[];
  excludeCompleted?: boolean;
};

export function useServiceQueue(filters?: QueueFilters) {
  const queryClient = useQueryClient();

  // Query para buscar a fila
  const query = useQuery({
    queryKey: ["service-queue", filters],
    queryFn: async () => {
      let queryBuilder = supabase
        .from("service_queue" as any)
        .select("*")
        .order("waiting_since", { ascending: true });

      if (filters?.channel) {
        queryBuilder = queryBuilder.eq("channel", filters.channel);
      }

      if (filters?.status && filters.status.length > 0) {
        queryBuilder = queryBuilder.in("status", filters.status);
      } else if (filters?.excludeCompleted !== false) {
        queryBuilder = queryBuilder.in("status", ["waiting", "in_progress", "forwarded"]);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        // Table doesn't exist yet — return empty gracefully
        if (error.code === "PGRST205") {
          return [] as ServiceQueueItem[];
        }
        console.error("Error fetching service queue:", error);
        throw error;
      }

      return (data || []) as unknown as ServiceQueueItem[];
    },
    refetchInterval: 30000,
    retry: (failureCount, error: any) => {
      if (error?.code === "PGRST205") return false;
      return failureCount < 3;
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("service-queue-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_queue" },
        (payload) => {
          console.log("Service queue update:", payload);
          queryClient.invalidateQueries({ queryKey: ["service-queue"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// Hook para adicionar item à fila
export function useAddToQueue() {
  const queryClient = useQueryClient();

  const addToQueue = async (item: Partial<ServiceQueueItem>) => {
    const { data, error } = await supabase
      .from("service_queue" as any)
      .insert({
        channel: item.channel || "web",
        status: item.status || "waiting",
        priority: item.priority || 3,
        customer_name: item.customer_name,
        customer_email: item.customer_email,
        customer_phone: item.customer_phone,
        customer_avatar: item.customer_avatar,
        subject: item.subject,
        last_message: item.last_message,
        unread_count: item.unread_count || 1,
        complaint_id: item.complaint_id,
        voice_session_id: item.voice_session_id,
        waiting_since: item.waiting_since || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding to queue:", error);
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ["service-queue"] });
    return data as unknown as ServiceQueueItem;
  };

  return { addToQueue };
}

// Hook para atualizar item da fila
export function useUpdateQueueItem() {
  const queryClient = useQueryClient();

  const updateQueueItem = async (id: string, updates: Partial<ServiceQueueItem>) => {
    const { data, error } = await supabase
      .from("service_queue" as any)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating queue item:", error);
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ["service-queue"] });
    return data as unknown as ServiceQueueItem;
  };

  return { updateQueueItem };
}
