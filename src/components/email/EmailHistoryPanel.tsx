import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  Send,
  Inbox,
  ArrowUpRight,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useComplaintEmails, useSendWorkflowEmail, type EmailMessage } from "@/hooks/useEmailAccounts";
import { useAuth } from "@/contexts/AuthContext";

interface EmailHistoryPanelProps {
  complaintId: string;
  complaintProtocol: string;
  responsibleEmail?: string;
  responsibleName?: string;
}

export function EmailHistoryPanel({ 
  complaintId, 
  complaintProtocol,
  responsibleEmail,
  responsibleName,
}: EmailHistoryPanelProps) {
  const { data: emails, isLoading } = useComplaintEmails(complaintId);
  const sendEmail = useSendWorkflowEmail();
  const { user } = useAuth();

  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [composeData, setComposeData] = useState({
    to: responsibleEmail || "",
    cc: "",
    body: "",
  });

  const handleSend = async () => {
    if (!composeData.to || !composeData.body) return;

    await sendEmail.mutateAsync({
      complaint_id: complaintId,
      to_email: composeData.to,
      body_html: `<p>${composeData.body.replace(/\n/g, "<br>")}</p>`,
      body_text: composeData.body,
      sender_user_id: user?.id,
      cc: composeData.cc ? composeData.cc.split(",").map(s => s.trim()) : undefined,
    });

    setShowComposeDialog(false);
    setComposeData({ to: responsibleEmail || "", cc: "", body: "" });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Emails ({emails?.length || 0})
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setShowComposeDialog(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Novo Email
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !emails || emails.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-2">
          Nenhum email enviado ou recebido para esta solicitação.
        </p>
      ) : (
        <ScrollArea className="max-h-[250px]">
          <div className="space-y-2">
            {emails.map((email) => (
              <EmailItem
                key={email.id}
                email={email}
                isExpanded={expandedEmail === email.id}
                onToggle={() => setExpandedEmail(expandedEmail === email.id ? null : email.id)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Compose Dialog */}
      <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Enviar Email
            </DialogTitle>
            <DialogDescription>
              Protocolo: {complaintProtocol}. O assunto incluirá automaticamente a referência ao protocolo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Para *</Label>
              <Input
                type="email"
                placeholder="destinatario@email.com"
                value={composeData.to}
                onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>CC (separar por vírgula)</Label>
              <Input
                placeholder="copia1@email.com, copia2@email.com"
                value={composeData.cc}
                onChange={(e) => setComposeData({ ...composeData, cc: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Mensagem *</Label>
              <Textarea
                placeholder="Escreva sua mensagem..."
                value={composeData.body}
                onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                rows={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowComposeDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={sendEmail.isPending || !composeData.to || !composeData.body}
              className="gap-2"
            >
              {sendEmail.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmailItem({ email, isExpanded, onToggle }: { email: EmailMessage; isExpanded: boolean; onToggle: () => void }) {
  const isInbound = email.direction === "inbound";

  return (
    <div
      className={cn(
        "rounded-lg border p-3 cursor-pointer transition-colors",
        isInbound ? "bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900" : "bg-card"
      )}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isInbound ? (
            <Inbox className="h-4 w-4 text-blue-500 flex-shrink-0" />
          ) : (
            <ArrowUpRight className="h-4 w-4 text-green-500 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {isInbound ? email.from_address : `Para: ${email.to_addresses?.join(", ")}`}
            </p>
            <p className="text-xs text-muted-foreground truncate">{email.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={isInbound ? "secondary" : "outline"} className="text-[10px]">
            {isInbound ? "Recebido" : "Enviado"}
          </Badge>
          {email.sent_at && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {format(new Date(email.sent_at), "dd/MM HH:mm", { locale: ptBR })}
            </span>
          )}
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t text-sm">
          <div className="space-y-1 text-xs text-muted-foreground mb-2">
            <p><strong>De:</strong> {email.from_address}</p>
            <p><strong>Para:</strong> {email.to_addresses?.join(", ")}</p>
            {email.cc_addresses && email.cc_addresses.length > 0 && (
              <p><strong>CC:</strong> {email.cc_addresses.join(", ")}</p>
            )}
          </div>
          <Separator className="my-2" />
          {email.body_html ? (
            <div 
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: email.body_html }}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm">{email.body_text}</p>
          )}
        </div>
      )}
    </div>
  );
}
