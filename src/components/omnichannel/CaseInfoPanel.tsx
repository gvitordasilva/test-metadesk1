import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ServiceTimer } from "./ServiceTimer";
import { SentimentIndicator } from "./SentimentIndicator";
import {
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Clock,
  X,
  AlertCircle,
  Brain,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Minus,
  Frown,
  Angry,
} from "lucide-react";

type CaseData = {
  id: string;
  protocol?: string;
  type?: string;
  category?: string;
  description?: string;
  status?: string;
  aiTriage?: {
    sentiment: string;
    urgency: string;
    scenario_summary: string;
    risk_factors?: string[];
    recommended_action?: string;
  } | null;
  client: {
    name: string;
    email?: string;
    phone?: string;
    cpf?: string;
    address?: string;
    avatar?: string;
  };
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
};

type CaseInfoPanelProps = {
  caseData: CaseData | null;
  formattedDuration: string;
  isSessionActive: boolean;
  sentiment: "positive" | "neutral" | "frustrated" | "angry" | null;
  onClose: () => void;
  tmaSla?: { target: number; warning: number | null; critical: number | null };
};

export function CaseInfoPanel({
  caseData,
  formattedDuration,
  isSessionActive,
  sentiment,
  onClose,
  tmaSla,
}: CaseInfoPanelProps) {
  if (!caseData) {
    return (
      <div className="w-80 border-l h-full flex items-center justify-center text-muted-foreground p-4 text-center">
        <div>
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Selecione uma conversa para ver os detalhes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b bg-muted/20">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Informações do Caso</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Timer e Sentimento */}
        <div className="space-y-2">
          <ServiceTimer
            formattedDuration={formattedDuration}
            isActive={isSessionActive}
          />
          {tmaSla && isSessionActive && (
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Meta TMA: {tmaSla.target} min
            </div>
          )}
          <SentimentIndicator sentiment={sentiment} />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Avatar e Nome */}
          <div className="flex flex-col items-center text-center">
            {caseData.client.avatar ? (
              <img
                src={caseData.client.avatar}
                alt={caseData.client.name}
                className="w-16 h-16 rounded-full mb-2 object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <User className="h-8 w-8 text-primary" />
              </div>
            )}
            <h4 className="font-medium">{caseData.client.name}</h4>
            {caseData.protocol && (
              <p className="text-sm text-muted-foreground">
                Protocolo: {caseData.protocol}
              </p>
            )}
          </div>

          <Separator />

          {/* Resumo do Caso */}
          {(caseData.type || caseData.category || caseData.description) && (
            <>
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Resumo do Caso
                </h4>
                <div className="space-y-2">
                  {caseData.type && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{caseData.type}</Badge>
                      {caseData.category && (
                        <Badge variant="secondary">{caseData.category}</Badge>
                      )}
                    </div>
                  )}
                  {caseData.status && (
                    <Badge
                      className={
                        caseData.status === "novo"
                          ? "bg-blue-500"
                          : caseData.status === "em_andamento"
                          ? "bg-yellow-500"
                          : caseData.status === "concluido"
                          ? "bg-green-500"
                          : "bg-gray-500"
                      }
                    >
                      {caseData.status}
                    </Badge>
                  )}
                  {caseData.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {caseData.description}
                    </p>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Triagem IA */}
          {caseData.aiTriage && (
            <>
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Triagem IA
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const sentimentMap: Record<string, { icon: React.ElementType; color: string; label: string }> = {
                        positivo: { icon: TrendingUp, color: "text-green-500", label: "Positivo" },
                        neutro: { icon: Minus, color: "text-gray-400", label: "Neutro" },
                        preocupado: { icon: AlertTriangle, color: "text-yellow-500", label: "Preocupado" },
                        frustrado: { icon: Frown, color: "text-orange-500", label: "Frustrado" },
                        irritado: { icon: Angry, color: "text-red-500", label: "Irritado" },
                      };
                      const s = sentimentMap[caseData.aiTriage!.sentiment] || sentimentMap.neutro;
                      const SIcon = s.icon;
                      return (
                        <>
                          <SIcon className={`h-4 w-4 ${s.color}`} />
                          <span className="text-xs font-medium">{s.label}</span>
                        </>
                      );
                    })()}
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        caseData.aiTriage!.urgency === 'critica' ? 'border-red-500 text-red-500' :
                        caseData.aiTriage!.urgency === 'alta' ? 'border-orange-500 text-orange-500' :
                        caseData.aiTriage!.urgency === 'media' ? 'border-yellow-500 text-yellow-500' :
                        'border-green-500 text-green-500'
                      }`}
                    >
                      {caseData.aiTriage!.urgency}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {caseData.aiTriage!.scenario_summary}
                  </p>
                  {caseData.aiTriage!.recommended_action && (
                    <div className="flex items-start gap-1.5 text-xs bg-primary/5 p-2 rounded-md">
                      <Sparkles className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                      <span>{caseData.aiTriage!.recommended_action}</span>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Dados de Contato */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Dados de Contato
            </h4>
            <div className="space-y-2 text-sm">
              {caseData.client.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="break-all">{caseData.client.email}</span>
                </div>
              )}
              {caseData.client.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{caseData.client.phone}</span>
                </div>
              )}
              {caseData.client.cpf && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>CPF: {caseData.client.cpf}</span>
                </div>
              )}
            </div>
          </div>

          {/* Endereço */}
          {caseData.client.address && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço
                </h4>
                <p className="text-sm text-muted-foreground">
                  {caseData.client.address}
                </p>
              </div>
            </>
          )}

          {/* Anexos */}
          {caseData.attachments && caseData.attachments.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Anexos ({caseData.attachments.length})
                </h4>
                <div className="space-y-2">
                  {caseData.attachments.map((attachment, index) => (
                    <a
                      key={index}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-md bg-muted hover:bg-muted/80 transition-colors text-sm"
                    >
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{attachment.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Histórico */}
          <Separator />
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Histórico
            </h4>
            <div className="space-y-2">
              <div className="text-xs bg-muted p-2 rounded-md">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">Abertura do caso</span>
                  <span className="text-muted-foreground">Hoje</span>
                </div>
                <p className="text-muted-foreground">
                  Cliente iniciou contato via WhatsApp
                </p>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
