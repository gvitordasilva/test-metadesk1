import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type TriageResult = {
  sentiment: string;
  urgency: string;
  scenario_summary: string;
  suggested_category?: string;
  risk_factors: string[];
  recommended_action: string;
};

export function useComplaintTriage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      complaint_id,
      description,
      type,
      category,
      channel,
      reporter_name,
      is_anonymous,
    }: {
      complaint_id: string;
      description: string;
      type?: string;
      category?: string;
      channel?: string;
      reporter_name?: string;
      is_anonymous?: boolean;
    }): Promise<TriageResult> => {
      const { data, error } = await supabase.functions.invoke("complaint-ai-triage", {
        body: { complaint_id, description, type, category, channel, reporter_name, is_anonymous },
      });

      if (error) throw error;
      return data.triage as TriageResult;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["complaint", variables.complaint_id] });
    },
  });
}

export type { TriageResult };
