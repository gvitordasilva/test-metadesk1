import { useState } from "react";
import { Search, Copy, Check, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuickMessages, QuickMessage } from "@/hooks/useQuickMessages";
import { cn } from "@/lib/utils";

type QuickMessagesPanelProps = {
  onSelect: (content: string) => void;
  onClose: () => void;
};

const categoryLabels: Record<string, string> = {
  saudacao: "Saudação",
  procedimento: "Procedimento",
  encerramento: "Encerramento",
  geral: "Geral",
};

const categoryColors: Record<string, string> = {
  saudacao: "bg-green-500/10 text-green-600 border-green-500/30",
  procedimento: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  encerramento: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  geral: "bg-gray-500/10 text-gray-600 border-gray-500/30",
};

export function QuickMessagesPanel({ onSelect, onClose }: QuickMessagesPanelProps) {
  const { messages, categories, isLoading } = useQuickMessages();
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      msg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (msg.shortcut && msg.shortcut.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = !selectedCategory || msg.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleSelect = (message: QuickMessage) => {
    onSelect(message.content);
    setCopiedId(message.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-background border-l">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Mensagens Rápidas
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ou digitar atalho..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 text-xs",
              !selectedCategory && "bg-primary text-primary-foreground"
            )}
            onClick={() => setSelectedCategory(null)}
          >
            Todas
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant="outline"
              size="sm"
              className={cn(
                "h-7 text-xs",
                selectedCategory === cat && "bg-primary text-primary-foreground"
              )}
              onClick={() => setSelectedCategory(cat)}
            >
              {categoryLabels[cat] || cat}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando mensagens...
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma mensagem encontrada
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => handleSelect(message)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{message.title}</h4>
                    {message.shortcut && (
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {message.shortcut}
                      </code>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px]", categoryColors[message.category])}
                  >
                    {categoryLabels[message.category] || message.category}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {message.content}
                </p>
                <div className="flex justify-end mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(message);
                    }}
                  >
                    {copiedId === message.id ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Inserido
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Inserir
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
