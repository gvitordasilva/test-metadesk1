import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Save, GripVertical, MessageSquare, ListOrdered, Zap, Trash2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableChatbotNode } from "./SortableChatbotNode";
import {
  ChatbotFlow,
  ChatbotNode,
  useChatbotNodes,
  useUpdateChatbotFlow,
  useCreateChatbotNode,
  useUpdateChatbotNode,
  useDeleteChatbotNode,
  useBulkUpdateNodes,
} from "@/hooks/useChatbotFlows";
import { toast } from "sonner";

interface ChatbotFlowEditorProps {
  flow: ChatbotFlow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatbotFlowEditor({
  flow,
  open,
  onOpenChange,
}: ChatbotFlowEditorProps) {
  const { data: nodes = [], isLoading } = useChatbotNodes(flow.id);
  const updateFlow = useUpdateChatbotFlow();
  const createNode = useCreateChatbotNode();
  const updateNode = useUpdateChatbotNode();
  const deleteNode = useDeleteChatbotNode();
  const bulkUpdateNodes = useBulkUpdateNodes();

  const [flowName, setFlowName] = useState(flow.name);
  const [flowDescription, setFlowDescription] = useState(flow.description || "");
  const [flowChannel, setFlowChannel] = useState(flow.channel);
  const [localNodes, setLocalNodes] = useState<ChatbotNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    setLocalNodes(nodes);
  }, [nodes]);

  useEffect(() => {
    setFlowName(flow.name);
    setFlowDescription(flow.description || "");
    setFlowChannel(flow.channel);
  }, [flow]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localNodes.findIndex((n) => n.id === active.id);
      const newIndex = localNodes.findIndex((n) => n.id === over.id);

      const newNodes = arrayMove(localNodes, oldIndex, newIndex);
      setLocalNodes(newNodes);

      // Update node orders
      const updates = newNodes.map((node, index) => ({
        id: node.id,
        node_order: index,
      }));

      try {
        await bulkUpdateNodes.mutateAsync(updates);
      } catch (error) {
        toast.error("Erro ao reordenar nós");
      }
    }
  };

  const handleSaveFlow = async () => {
    try {
      await updateFlow.mutateAsync({
        id: flow.id,
        name: flowName,
        description: flowDescription,
        channel: flowChannel,
      });
      toast.success("Fluxo salvo com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar fluxo");
    }
  };

  const handleAddNode = async (type: "message" | "menu" | "action") => {
    const nodeNames = {
      message: "Nova Mensagem",
      menu: "Novo Menu",
      action: "Nova Ação",
    };

    try {
      const newNode = await createNode.mutateAsync({
        flow_id: flow.id,
        node_type: type,
        name: nodeNames[type],
        content: type === "message" ? "Digite sua mensagem aqui..." : type === "menu" ? "Escolha uma opção:" : "",
        action_type: type === "action" ? "escalate" : "none",
        node_order: localNodes.length,
        is_entry_point: localNodes.length === 0,
      });

      setSelectedNodeId(newNode.id);
      toast.success("Nó adicionado!");
    } catch (error) {
      toast.error("Erro ao adicionar nó");
    }
  };

  const handleUpdateNode = async (nodeId: string, updates: Partial<ChatbotNode>) => {
    try {
      await updateNode.mutateAsync({ id: nodeId, ...updates });
    } catch (error) {
      toast.error("Erro ao atualizar nó");
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    try {
      await deleteNode.mutateAsync({ id: nodeId, flowId: flow.id });
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
      toast.success("Nó removido!");
    } catch (error) {
      toast.error("Erro ao remover nó");
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquare className="h-4 w-4" />;
      case "menu":
        return <ListOrdered className="h-4 w-4" />;
      case "action":
        return <Zap className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Editor de Fluxo</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 h-[70vh]">
          {/* Flow Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="flowName">Nome do Fluxo</Label>
              <Input
                id="flowName"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flowDescription">Descrição</Label>
              <Textarea
                id="flowDescription"
                value={flowDescription}
                onChange={(e) => setFlowDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flowChannel">Canal</Label>
              <Select value={flowChannel} onValueChange={setFlowChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Canais</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="webchat">Widget de Página</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSaveFlow} className="w-full" disabled={updateFlow.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Fluxo
            </Button>

            <Separator />

            <div className="space-y-2">
              <Label>Adicionar Nó</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleAddNode("message")}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Mensagem
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleAddNode("menu")}
                >
                  <ListOrdered className="h-4 w-4 mr-1" />
                  Menu
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleAddNode("action")}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Ação
                </Button>
              </div>
            </div>
          </div>

          {/* Node List */}
          <div className="col-span-2 border rounded-lg">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-medium">Nós do Fluxo</h3>
              <p className="text-xs text-muted-foreground">
                Arraste para reordenar
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : localNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-2" />
                <p>Nenhum nó adicionado</p>
                <p className="text-xs">Adicione nós usando os botões à esquerda</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(70vh-100px)]">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={localNodes.map((n) => n.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="p-2 space-y-2">
                      {localNodes.map((node) => (
                        <SortableChatbotNode
                          key={node.id}
                          node={node}
                          allNodes={localNodes}
                          isSelected={selectedNodeId === node.id}
                          onSelect={() => setSelectedNodeId(node.id)}
                          onUpdate={handleUpdateNode}
                          onDelete={() => handleDeleteNode(node.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
