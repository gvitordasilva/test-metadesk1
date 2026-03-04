import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Complaint = Database["public"]["Tables"]["complaints"]["Row"];

export interface ComplaintFilters {
  status?: string;
  type?: string;
  category?: string;
  channel?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ComplaintStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  closed: number;
  todayCount: number;
  byType: { type: string; count: number; label: string }[];
  byCategory: { category: string; count: number }[];
}

const typeLabels: Record<string, string> = {
  reclamacao: "Reclamação",
  denuncia: "Denúncia",
  sugestao: "Sugestão",
  elogio: "Elogio",
};

const statusLabels: Record<string, string> = {
  novo: "Novo",
  visualizado: "Visualizado",
  em_analise: "Em Análise",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

export function useComplaints(filters?: ComplaintFilters) {
  return useQuery({
    queryKey: ["complaints", filters],
    queryFn: async () => {
      let query = supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.type) {
        query = query.eq("type", filters.type);
      }
      if (filters?.category) {
        query = query.eq("category", filters.category);
      }
      if (filters?.channel) {
        query = query.eq("channel", filters.channel);
      }
      if (filters?.search) {
        query = query.or(
          `protocol_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%,reporter_name.ilike.%${filters.search}%`
        );
      }
      if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Complaint[];
    },
  });
}

export function useComplaint(id: string | null) {
  return useQuery({
    queryKey: ["complaint", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Complaint;
    },
    enabled: !!id,
  });
}

export function useComplaintStats() {
  return useQuery({
    queryKey: ["complaint-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("id, status, type, category, created_at");

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats: ComplaintStats = {
        total: data.length,
        pending: data.filter((c) => c.status === "novo" || c.status === "visualizado").length,
        inProgress: data.filter((c) => c.status === "em_analise").length,
        resolved: data.filter((c) => c.status === "resolvido").length,
        closed: data.filter((c) => c.status === "fechado").length,
        todayCount: data.filter(
          (c) => new Date(c.created_at) >= today
        ).length,
        byType: [],
        byCategory: [],
      };

      // Agrupar por tipo
      const typeCount = data.reduce((acc, c) => {
        acc[c.type] = (acc[c.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      stats.byType = Object.entries(typeCount).map(([type, count]) => ({
        type,
        count,
        label: typeLabels[type] || type,
      }));

      // Agrupar por categoria
      const categoryCount = data.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      stats.byCategory = Object.entries(categoryCount).map(
        ([category, count]) => ({
          category,
          count,
        })
      );

      return stats;
    },
    refetchInterval: 30000, // Refresh every 30s for live badges
  });
}

export function useUpdateComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
      auditEntries,
    }: {
      id: string;
      updates: Partial<Complaint>;
      auditEntries?: Array<{
        complaint_id: string;
        action: string;
        field_changed: string;
        old_value: string | null;
        new_value: string | null;
        user_email?: string;
      }>;
    }) => {
      const { data, error } = await supabase
        .from("complaints")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Insert audit log entries
      if (auditEntries && auditEntries.length > 0) {
        const { error: auditError } = await supabase
          .from("complaint_audit_log" as any)
          .insert(auditEntries);

        if (auditError) {
          console.error("Audit log error:", auditError);
          // Don't fail the update if audit fails
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["complaint-stats"] });
      queryClient.invalidateQueries({ queryKey: ["complaint", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["complaint-audit", variables.id] });
    },
  });
}

export function useComplaintAuditLog(complaintId: string | null) {
  return useQuery({
    queryKey: ["complaint-audit", complaintId],
    queryFn: async () => {
      if (!complaintId) return [];

      const { data, error } = await supabase
        .from("complaint_audit_log" as any)
        .select("*")
        .eq("complaint_id", complaintId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as Array<{
        id: string;
        complaint_id: string;
        user_id: string | null;
        user_email: string | null;
        action: string;
        field_changed: string;
        old_value: string | null;
        new_value: string | null;
        notes: string | null;
        created_at: string;
      }>;
    },
    enabled: !!complaintId,
  });
}

export function useAttendants() {
  return useQuery({
    queryKey: ["attendants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendant_profiles")
        .select("id, user_id, full_name, email, status")
        .eq("status", "online");

      if (error) throw error;
      return data;
    },
  });
}

export { typeLabels, statusLabels };
