import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  MessageSquare,
  MailOpen,
  Phone,
  MessageCircle,
  Filter,
  FileText,
  Loader2,
  CheckSquare,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WaitingTimeIndicator } from "./WaitingTimeIndicator";
import { useServiceQueue, ServiceQueueItem, ServiceQueueChannel } from "@/hooks/useServiceQueue";

// Configuração de canais (padronizado com Monitoramento)
const channelConfig: Record<ServiceQueueChannel, { icon: React.ElementType; color: string; label: string }> = {
  web: { icon: FileText, color: "#4deb92", label: "Formulário Escrito" },
  voice: { icon: Phone, color: "#a18aff", label: "Voz IA" },
  phone: { icon: Phone, color: "#a18aff", label: "Voz IA" },
  whatsapp: { icon: MessageSquare, color: "#25D366", label: "WhatsApp" },
  email: { icon: MailOpen, color: "#ff9f43", label: "Email" },
  chat: { icon: MessageCircle, color: "#7ae4ff", label: "Chatbot Assistido" },
};

type ConversationsListProps = {
  onSelect: (id: string) => void;
  selectedId?: string;
};

export function ConversationsList({
  onSelect,
  selectedId,
}: ConversationsListProps) {
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  // Buscar dados reais da fila
  const { data: queueItems = [], isLoading } = useServiceQueue({
    excludeCompleted: !showCompleted,
  });

  // Filtrar por canal e busca
  const filteredConversations = useMemo(() => {
    let result = filter === "all"
      ? queueItems
      : queueItems.filter((item) => item.channel === filter);

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          (item.customer_name?.toLowerCase().includes(term)) ||
          (item.subject?.toLowerCase().includes(term)) ||
          (item.last_message?.toLowerCase().includes(term))
      );
    }

    return result;
  }, [queueItems, filter, searchTerm]);

  // Ordenar por tempo de espera (maior tempo primeiro)
  const sortedConversations = useMemo(() => {
    return [...filteredConversations].sort((a, b) => {
      const aTime = new Date(a.waiting_since).getTime();
      const bTime = new Date(b.waiting_since).getTime();
      return aTime - bTime; // Mais antigo primeiro
    });
  }, [filteredConversations]);

  const getChannelIcon = (channel: ServiceQueueChannel) => {
    const config = channelConfig[channel];
    if (!config) {
      return <MessageCircle className="h-4 w-4 text-muted-foreground" />;
    }
    const Icon = config.icon;
    return <Icon className="h-4 w-4" style={{ color: config.color }} />;
  };

  return (
    <div className="flex flex-col h-full border-r">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar conversas..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant={showCompleted ? "default" : "outline"}
                  onClick={() => setShowCompleted(!showCompleted)}
                >
                  <CheckSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showCompleted ? "Ocultar finalizados" : "Mostrar finalizados"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button size="icon" variant="outline">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="all" onClick={() => setFilter("all")}>
              Todos
            </TabsTrigger>
            <TabsTrigger
              value="whatsapp"
              onClick={() => setFilter("whatsapp")}
              className="flex items-center gap-1"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </TabsTrigger>
            <TabsTrigger
              value="voice"
              onClick={() => setFilter("voice")}
              className="flex items-center gap-1"
            >
              <Phone className="h-3.5 w-3.5" />
            </TabsTrigger>
            <TabsTrigger
              value="email"
              onClick={() => setFilter("email")}
              className="flex items-center gap-1"
            >
              <MailOpen className="h-3.5 w-3.5" />
            </TabsTrigger>
            <TabsTrigger
              value="web"
              onClick={() => setFilter("web")}
              className="flex items-center gap-1"
            >
              <FileText className="h-3.5 w-3.5" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-grow overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nenhum atendimento na fila</p>
          </div>
        ) : (
          <div className="divide-y">
            {sortedConversations.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                  selectedId === item.id && "bg-primary/10"
                )}
                onClick={() => onSelect(item.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    {item.customer_avatar ? (
                      <img
                        src={item.customer_avatar}
                        alt={item.customer_name || "Cliente"}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium text-muted-foreground">
                          {item.customer_name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                      {getChannelIcon(item.channel)}
                    </div>
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-medium truncate">
                        {item.customer_name || "Anônimo"}
                      </h4>
                      <WaitingTimeIndicator
                        waitingSince={item.waiting_since}
                        size="sm"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.subject || item.last_message || "Novo atendimento"}
                    </p>
                    {/* AI Triage sentiment indicator */}
                    {(item as any).ai_sentiment && (
                      <span className={`text-xs ${
                        (item as any).ai_sentiment === 'irritado' ? 'text-red-500' :
                        (item as any).ai_sentiment === 'frustrado' ? 'text-orange-500' :
                        (item as any).ai_sentiment === 'preocupado' ? 'text-yellow-500' :
                        'text-muted-foreground'
                      }`}>
                        🤖 {(item as any).ai_sentiment}
                      </span>
                    )}
                  </div>
                  {item.unread_count > 0 && (
                    <Badge className="bg-metadesk-green ml-2 flex-shrink-0">
                      {item.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
