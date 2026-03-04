import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  GripVertical,
  MessageSquare,
  ListOrdered,
  Zap,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
  Star,
} from "lucide-react";
import { ChatbotNode, ChatbotNodeOption, useChatbotNodeOptions, useCreateNodeOption, useUpdateNodeOption, useDeleteNodeOption } from "@/hooks/useChatbotFlows";
import { toast } from "sonner";

interface SortableChatbotNodeProps {
  node: ChatbotNode;
  allNodes: ChatbotNode[];
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (nodeId: string, updates: Partial<ChatbotNode>) => void;
  onDelete: () => void;
}

export function SortableChatbotNode({
  node,
  allNodes,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: SortableChatbotNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const { data: options = [] } = useChatbotNodeOptions(node.node_type === "menu" ? node.id : null);
  const createOption = useCreateNodeOption();
  const updateOption = useUpdateNodeOption();
  const deleteOption = useDeleteNodeOption();

  const [isOpen, setIsOpen] = useState(false);
  const [localContent, setLocalContent] = useState(node.content || "");
  const [localName, setLocalName] = useState(node.name);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getNodeIcon = () => {
    switch (node.node_type) {
      case "message":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "menu":
        return <ListOrdered className="h-4 w-4 text-green-500" />;
      case "action":
        return <Zap className="h-4 w-4 text-yellow-500" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getNodeTypeLabel = () => {
    switch (node.node_type) {
      case "message":
        return "Mensagem";
      case "menu":
        return "Menu";
      case "action":
        return "Ação";
      default:
        return node.node_type;
    }
  };

  const handleContentBlur = () => {
    if (localContent !== node.content) {
      onUpdate(node.id, { content: localContent });
    }
  };

  const handleNameBlur = () => {
    if (localName !== node.name) {
      onUpdate(node.id, { name: localName });
    }
  };

  const handleAddOption = async () => {
    try {
      await createOption.mutateAsync({
        node_id: node.id,
        option_key: String(options.length + 1),
        option_text: "Nova opção",
        option_order: options.length,
      });
    } catch (error) {
      toast.error("Erro ao adicionar opção");
    }
  };

  const handleUpdateOption = async (optionId: string, updates: Partial<ChatbotNodeOption>) => {
    try {
      await updateOption.mutateAsync({ id: optionId, ...updates });
    } catch (error) {
      toast.error("Erro ao atualizar opção");
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    try {
      await deleteOption.mutateAsync({ id: optionId, nodeId: node.id });
    } catch (error) {
      toast.error("Erro ao remover opção");
    }
  };

  const handleToggleEntryPoint = () => {
    onUpdate(node.id, { is_entry_point: !node.is_entry_point });
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`transition-all ${isSelected ? "ring-2 ring-primary" : ""} ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="p-3">
          <div className="flex items-center gap-2">
            <button
              className="cursor-grab active:cursor-grabbing touch-none"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>

            <CollapsibleTrigger className="flex items-center gap-2 flex-1" onClick={onSelect}>
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {getNodeIcon()}
              <span className="font-medium text-sm truncate">{node.name}</span>
              <Badge variant="outline" className="text-xs ml-auto">
                {getNodeTypeLabel()}
              </Badge>
              {node.is_entry_point && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Início
                </Badge>
              )}
            </CollapsibleTrigger>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleToggleEntryPoint}
              title={node.is_entry_point ? "Remover como ponto de entrada" : "Definir como ponto de entrada"}
            >
              <Star className={`h-4 w-4 ${node.is_entry_point ? "fill-yellow-400 text-yellow-400" : ""}`} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium">Nome do Nó</label>
              <Input
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onBlur={handleNameBlur}
                className="h-8 text-sm"
              />
            </div>

            {node.node_type !== "action" && (
              <div className="space-y-2">
                <label className="text-xs font-medium">Conteúdo</label>
                <Textarea
                  value={localContent}
                  onChange={(e) => setLocalContent(e.target.value)}
                  onBlur={handleContentBlur}
                  rows={3}
                  className="text-sm"
                  placeholder="Digite o texto da mensagem..."
                />
              </div>
            )}

            {node.node_type === "action" && (
              <div className="space-y-2">
                <label className="text-xs font-medium">Tipo de Ação</label>
                <Select
                  value={node.action_type}
                  onValueChange={(value) => onUpdate(node.id, { action_type: value as any })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="escalate">Transferir para Atendente</SelectItem>
                    <SelectItem value="end">Encerrar Conversa</SelectItem>
                    <SelectItem value="goto">Ir para Outro Nó</SelectItem>
                  </SelectContent>
                </Select>

                {node.action_type !== "goto" && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Mensagem da Ação</label>
                    <Textarea
                      value={localContent}
                      onChange={(e) => setLocalContent(e.target.value)}
                      onBlur={handleContentBlur}
                      rows={2}
                      className="text-sm"
                      placeholder="Mensagem ao executar a ação..."
                    />
                  </div>
                )}

                {node.action_type === "goto" && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Ir para</label>
                    <Select
                      value={node.next_node_id || ""}
                      onValueChange={(value) => onUpdate(node.id, { next_node_id: value || null })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Selecione um nó" />
                      </SelectTrigger>
                      <SelectContent>
                        {allNodes
                          .filter((n) => n.id !== node.id)
                          .map((n) => (
                            <SelectItem key={n.id} value={n.id}>
                              {n.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {node.node_type === "message" && (
              <div className="space-y-2">
                <label className="text-xs font-medium">Próximo Nó</label>
                <Select
                  value={node.next_node_id || ""}
                  onValueChange={(value) => onUpdate(node.id, { next_node_id: value || null })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Selecione o próximo nó" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum (aguardar resposta)</SelectItem>
                    {allNodes
                      .filter((n) => n.id !== node.id)
                      .map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {node.node_type === "menu" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Opções do Menu</label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleAddOption}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar
                  </Button>
                </div>

                <div className="space-y-2">
                  {options.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center gap-2 p-2 bg-muted rounded-md"
                    >
                      <Input
                        value={option.option_key}
                        onChange={(e) =>
                          handleUpdateOption(option.id, { option_key: e.target.value })
                        }
                        className="w-12 h-7 text-xs text-center"
                        placeholder="#"
                      />
                      <Input
                        value={option.option_text}
                        onChange={(e) =>
                          handleUpdateOption(option.id, { option_text: e.target.value })
                        }
                        className="flex-1 h-7 text-xs"
                        placeholder="Texto da opção"
                      />
                      <Select
                        value={option.next_node_id || ""}
                        onValueChange={(value) =>
                          handleUpdateOption(option.id, { next_node_id: value || null })
                        }
                      >
                        <SelectTrigger className="w-32 h-7 text-xs">
                          <SelectValue placeholder="Destino" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Escalar</SelectItem>
                          {allNodes
                            .filter((n) => n.id !== node.id)
                            .map((n) => (
                              <SelectItem key={n.id} value={n.id}>
                                {n.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDeleteOption(option.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                  {options.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Adicione opções para o menu
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
