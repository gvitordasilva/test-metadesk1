import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SlaSettingRow = {
  id: string;
  metric_key: string;
  metric_label: string;
  target_value: number;
  unit: string;
  warning_threshold: number | null;
  critical_threshold: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function useSlaSettings() {
  return useQuery({
    queryKey: ["sla-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sla_settings" as any)
        .select("*")
        .order("metric_key");
      if (error) {
        // Table doesn't exist yet — return empty gracefully
        if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
          return [] as SlaSettingRow[];
        }
        throw error;
      }
      return (data || []) as unknown as SlaSettingRow[];
    },
    retry: (failureCount, error: any) => {
      if (error?.code === "PGRST205" || error?.message?.includes("does not exist")) return false;
      return failureCount < 3;
    },
  });
}

export function useSlaSettingByKey(key: string) {
  const { data } = useSlaSettings();
  return data?.find((s) => s.metric_key === key) || null;
}

export function useUpdateSlaSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; target_value: number; warning_threshold?: number | null; critical_threshold?: number | null }) => {
      const { error } = await supabase
        .from("sla_settings" as any)
        .update({
          target_value: params.target_value,
          warning_threshold: params.warning_threshold ?? null,
          critical_threshold: params.critical_threshold ?? null,
        })
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sla-settings"] }),
  });
}
