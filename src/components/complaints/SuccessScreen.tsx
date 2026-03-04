import { CheckCircle, Home, Plus, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { NPSSurvey } from "./NPSSurvey";
import { Separator } from "@/components/ui/separator";

interface SuccessScreenProps {
  protocolNumber: string;
  email: string | null;
  onNewComplaint: () => void;
  onGoHome: () => void;
  complaintId?: string | null;
  respondentName?: string | null;
  channel?: string;
}

export function SuccessScreen({
  protocolNumber,
  email,
  onNewComplaint,
  onGoHome,
  complaintId,
  respondentName,
  channel = "web",
}: SuccessScreenProps) {
  const { toast } = useToast();

  const copyProtocol = () => {
    navigator.clipboard.writeText(protocolNumber);
    toast({
      title: "Protocolo copiado!",
      description: "O número do protocolo foi copiado para a área de transferência.",
    });
  };

  return (
    <div className="text-center py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Success icon */}
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-green-50 mb-6">
        <CheckCircle className="w-12 h-12 text-[#4deb92]" />
      </div>

      <h2 className="text-3xl font-bold text-foreground mb-3">
        Solicitação Enviada!
      </h2>
      <p className="text-lg text-muted-foreground mb-8">
        Sua solicitação foi registrada com sucesso.
      </p>

      {/* Protocol number */}
      <div className="bg-muted rounded-lg p-6 inline-block mb-8">
        <p className="text-sm text-muted-foreground mb-2">Seu protocolo é:</p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-3xl font-mono font-bold text-primary">
            {protocolNumber}
          </span>
          <Button variant="ghost" size="icon" onClick={copyProtocol}>
            <Copy className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Email confirmation */}
      {email && (
        <p className="text-muted-foreground mb-8">
          Um e-mail foi enviado para <strong>{email}</strong> com os detalhes da
          sua solicitação. Guarde o número do protocolo para acompanhamento.
        </p>
      )}

      {!email && (
        <p className="text-muted-foreground mb-8">
          Anote o número do protocolo para acompanhamento futuro.
        </p>
      )}

      {/* NPS Survey */}
      <Separator className="my-6" />
      <NPSSurvey
        complaintId={complaintId}
        channel={channel}
        respondentName={respondentName}
        respondentEmail={email}
      />

      <Separator className="my-6" />

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="outline" onClick={onNewComplaint} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Solicitação
        </Button>
        <Button onClick={onGoHome} className="gap-2">
          <Home className="w-4 h-4" /> Página Inicial
        </Button>
      </div>
    </div>
  );
}
