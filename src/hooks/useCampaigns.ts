import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CampaignRecipient {
  name?: string;
  email?: string;
  phone?: string;
}

export interface CampaignInsert {
  name: string;
  description?: string;
  channel: "email" | "sms" | "whatsapp";
  subject?: string;
  content: string;
  recipients: CampaignRecipient[];
  scheduled_at?: string;
}

export function useCampaigns() {
  const queryClient = useQueryClient();

  const campaignsQuery = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createCampaign = useMutation({
    mutationFn: async (campaign: CampaignInsert) => {
      const status = campaign.scheduled_at ? "scheduled" : "draft";
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          name: campaign.name,
          description: campaign.description,
          channel: campaign.channel,
          subject: campaign.subject,
          content: campaign.content,
          recipients: campaign.recipients as any,
          total_recipients: campaign.recipients.length,
          status,
          scheduled_at: campaign.scheduled_at,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campanha criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar campanha: " + error.message);
    },
  });

  const dispatchCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await fetch(
        "https://udyjlesjcgxhgdiaptjp.supabase.co/functions/v1/campaign-dispatch",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWpsZXNqY2d4aGdkaWFwdGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNzQ1ODIsImV4cCI6MjA4NDg1MDU4Mn0.RrxAI4hEnYKipq68oLTl7l0-2UBr0gmYGVHZwHnOOIs`,
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWpsZXNqY2d4aGdkaWFwdGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNzQ1ODIsImV4cCI6MjA4NDg1MDU4Mn0.RrxAI4hEnYKipq68oLTl7l0-2UBr0gmYGVHZwHnOOIs",
          },
          body: JSON.stringify({ campaignId }),
        }
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(err.error || "Erro ao disparar campanha");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success(`Campanha enviada! ${data.delivered} entregues, ${data.failed} falhas.`);
    },
    onError: (error) => {
      toast.error("Erro ao disparar campanha: " + error.message);
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campanha excluída.");
    },
  });

  const updateCampaignStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("campaigns").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  return {
    campaigns: campaignsQuery.data || [],
    isLoading: campaignsQuery.isLoading,
    createCampaign,
    dispatchCampaign,
    deleteCampaign,
    updateCampaignStatus,
  };
}
