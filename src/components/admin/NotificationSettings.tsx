import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSlaSettings, SlaSettingRow } from "@/hooks/useSlaSettings";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, MessageSquare, Bell } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export function NotificationSettings() {
  const { data: settings, isLoading } = useSlaSettings();
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);

  const smsEnabled = settings?.find((s) => s.metric_key === "notif_sms_enabled");
  const emailEnabled = settings?.find((s) => s.metric_key === "notif_email_enabled");

  const handleToggle = async (setting: SlaSettingRow, newValue: boolean) => {
    setUpdating(setting.id);
    try {
      const { error } = await supabase
        .from("sla_settings" as any)
        .update({ target_value: newValue ? 1 : 0 })
        .eq("id", setting.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["sla-settings"] });
      toast.success(`${setting.metric_label} ${newValue ? "ativado" : "desativado"}`);
    } catch {
      toast.error("Erro ao atualizar configuração");
    } finally {
      setUpdating(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Notificações Automáticas</CardTitle>
            <CardDescription>
              Ative ou desative o envio automático de SMS e e-mail ao concluir o registro de uma solicitação
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {smsEnabled && (
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">SMS de confirmação</Label>
                <p className="text-xs text-muted-foreground">
                  Envia SMS com o número do protocolo ao solicitante via Twilio
                </p>
              </div>
            </div>
            <Switch
              checked={smsEnabled.target_value === 1}
              onCheckedChange={(val) => handleToggle(smsEnabled, val)}
              disabled={updating === smsEnabled.id}
            />
          </div>
        )}

        {emailEnabled && (
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">E-mail de confirmação</Label>
                <p className="text-xs text-muted-foreground">
                  Envia e-mail detalhado com protocolo, tipo, categoria e próximos passos via Resend
                </p>
              </div>
            </div>
            <Switch
              checked={emailEnabled.target_value === 1}
              onCheckedChange={(val) => handleToggle(emailEnabled, val)}
              disabled={updating === emailEnabled.id}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
