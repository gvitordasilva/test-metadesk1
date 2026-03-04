import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface EmailAccount {
  id: string;
  user_id: string;
  account_type: string;
  email_address: string;
  display_name: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  imap_host: string | null;
  imap_port: number | null;
  is_active: boolean;
  is_default: boolean;
  last_poll_at: string | null;
  last_poll_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailMessage {
  id: string;
  complaint_id: string;
  email_account_id: string | null;
  message_id: string | null;
  in_reply_to: string | null;
  thread_id: string | null;
  direction: string;
  from_address: string;
  to_addresses: string[];
  cc_addresses: string[] | null;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  sent_at: string | null;
  read_at: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export function useEmailAccounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["email-accounts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_accounts" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("is_default", { ascending: false });

      if (error) throw error;
      return data as unknown as EmailAccount[];
    },
    enabled: !!user,
  });
}

export function useCreateEmailAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (account: {
      account_type: string;
      email_address: string;
      display_name?: string;
      smtp_host?: string;
      smtp_port?: number;
      smtp_user?: string;
      smtp_password?: string;
      imap_host?: string;
      imap_port?: number;
      is_default?: boolean;
    }) => {
      // If setting as default, unset other defaults first
      if (account.is_default) {
        await supabase
          .from("email_accounts" as any)
          .update({ is_default: false })
          .eq("user_id", user!.id);
      }

      const { data, error } = await supabase
        .from("email_accounts" as any)
        .insert({
          ...account,
          user_id: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
      toast.success("Conta de email conectada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao conectar conta: " + error.message);
    },
  });
}

export function useDeleteEmailAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_accounts" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
      toast.success("Conta de email desconectada");
    },
    onError: (error: Error) => {
      toast.error("Erro ao desconectar: " + error.message);
    },
  });
}

export function useComplaintEmails(complaintId: string | null) {
  return useQuery({
    queryKey: ["complaint-emails", complaintId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_messages" as any)
        .select("*")
        .eq("complaint_id", complaintId!)
        .order("sent_at", { ascending: true });

      if (error) throw error;
      return data as unknown as EmailMessage[];
    },
    enabled: !!complaintId,
  });
}

export function useSendWorkflowEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      complaint_id: string;
      to_email: string;
      to_name?: string;
      body_html: string;
      body_text?: string;
      sender_user_id?: string;
      cc?: string[];
    }) => {
      const { data, error } = await supabase.functions.invoke("send-workflow-email", {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["complaint-emails", variables.complaint_id] });
      queryClient.invalidateQueries({ queryKey: ["complaint-audit", variables.complaint_id] });
      toast.success("Email enviado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao enviar email: " + error.message);
    },
  });
}
