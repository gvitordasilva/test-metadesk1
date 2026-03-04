import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageSquare,
  FileText,
  Zap,
  ArrowRightCircle,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ToolbarMode = "chat" | "documents" | "quick-messages";

type ConversationToolbarProps = {
  activeMode: ToolbarMode;
  onModeChange: (mode: ToolbarMode) => void;
  onForwardClick: () => void;
  onEndSession: () => void;
  hasActiveSession: boolean;
};

export function ConversationToolbar({
  activeMode,
  onModeChange,
  onForwardClick,
  onEndSession,
  hasActiveSession,
}: ConversationToolbarProps) {
  const tools = [
    {
      id: "chat" as ToolbarMode,
      icon: MessageSquare,
      label: "Chat",
      tooltip: "Conversa com o cliente",
    },
    {
      id: "documents" as ToolbarMode,
      icon: FileText,
      label: "Documentos",
      tooltip: "Documentos e anexos do caso",
    },
    {
      id: "quick-messages" as ToolbarMode,
      icon: Zap,
      label: "Mensagens Rápidas",
      tooltip: "Inserir mensagem pré-definida",
    },
  ];

  return (
    <div className="flex items-center justify-between p-2 border-b bg-muted/30">
      <div className="flex items-center gap-1">
        <TooltipProvider>
          {tools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={activeMode === tool.id ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2",
                    activeMode === tool.id && "shadow-sm"
                  )}
                  onClick={() => onModeChange(tool.id)}
                >
                  <tool.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tool.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tool.tooltip}</TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-orange-500/50 text-orange-600 hover:text-orange-700 hover:bg-orange-500/10"
                onClick={onForwardClick}
              >
                <ArrowRightCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Encaminhar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Encaminhar para outro setor</TooltipContent>
          </Tooltip>

          {hasActiveSession && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-green-500/50 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                  onClick={onEndSession}
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Finalizar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Finalizar atendimento</TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
}
