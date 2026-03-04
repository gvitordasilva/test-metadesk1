import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  MoreHorizontal,
  Mail,
  MessageSquare,
  Phone,
  Play,
  Pause,
  Send,
  Trash2,
  Loader2,
  Calendar,
  Eye,
} from "lucide-react";
import { useCampaigns, CampaignRecipient } from "@/hooks/useCampaigns";
import { format } from "date-fns";

type ChannelType = "email" | "sms" | "whatsapp";
type StatusType = "draft" | "scheduled" | "active" | "paused" | "completed" | "failed";

const channelIcons: Record<ChannelType, JSX.Element> = {
  email: <Mail className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4" />,
  sms: <Phone className="h-4 w-4" />,
};

const channelLabels: Record<ChannelType, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  sms: "SMS",
};

const statusLabels: Record<StatusType, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  active: "Em execução",
  paused: "Pausada",
  completed: "Concluída",
  failed: "Falha",
};

const statusBadgeVariant: Record<StatusType, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const tabs: { key: StatusType | "all"; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "draft", label: "Rascunhos" },
  { key: "scheduled", label: "Agendadas" },
  { key: "active", label: "Em execução" },
  { key: "paused", label: "Pausadas" },
  { key: "completed", label: "Concluídas" },
  { key: "failed", label: "Falhas" },
];

function CampaignDetailModal({
  campaign,
  open,
  onOpenChange,
  onDispatch,
  onDelete,
  onPause,
  isDispatching,
}: {
  campaign: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDispatch: (id: string) => void;
  onDelete: (id: string) => void;
  onPause: (id: string, status: string) => void;
  isDispatching: boolean;
}) {
  if (!campaign) return null;
  const channel = campaign.channel as ChannelType;
  const status = campaign.status as StatusType;
  const progress = campaign.total_recipients > 0
    ? Math.round((campaign.delivered / campaign.total_recipients) * 100)
    : 0;
  const recipients = (campaign.recipients || []) as Array<{ name?: string; email?: string; phone?: string }>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-muted-foreground">{channelIcons[channel]}</span>
            {campaign.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge className={statusBadgeVariant[status]}>{statusLabels[status]}</Badge>
            <Badge variant="outline">{channelLabels[channel]}</Badge>
          </div>

          {campaign.description && (
            <p className="text-sm text-muted-foreground">{campaign.description}</p>
          )}

          {campaign.subject && (
            <div>
              <Label className="text-xs text-muted-foreground">Assunto</Label>
              <p className="text-sm">{campaign.subject}</p>
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">Conteúdo</Label>
            <div className="mt-1 p-3 rounded-md bg-muted/50 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
              {campaign.content}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold">{campaign.total_recipients}</p>
              <p className="text-xs text-muted-foreground">Destinatários</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{campaign.delivered}</p>
              <p className="text-xs text-muted-foreground">Entregues</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{campaign.failed}</p>
              <p className="text-xs text-muted-foreground">Falhas</p>
            </div>
          </div>

          <Progress value={progress} className="h-2" />

          {recipients.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Destinatários ({recipients.length})</Label>
              <div className="mt-1 max-h-32 overflow-y-auto border rounded-md">
                <Table>
                  <TableBody>
                    {recipients.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="py-1 text-sm">{r.name || "—"}</TableCell>
                        <TableCell className="py-1 text-sm text-muted-foreground">{r.email || r.phone || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>Criada em {format(new Date(campaign.created_at), "dd/MM/yyyy HH:mm")}</span>
            {campaign.scheduled_at && (
              <span>• Agendada para {format(new Date(campaign.scheduled_at), "dd/MM/yyyy HH:mm")}</span>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          {status === "draft" && (
            <Button onClick={() => { onDispatch(campaign.id); onOpenChange(false); }} disabled={isDispatching}>
              <Send className="h-4 w-4 mr-2" />Disparar agora
            </Button>
          )}
          {status === "active" && (
            <Button variant="outline" onClick={() => { onPause(campaign.id, "paused"); onOpenChange(false); }}>
              <Pause className="h-4 w-4 mr-2" />Pausar
            </Button>
          )}
          {status === "paused" && (
            <Button variant="outline" onClick={() => { onPause(campaign.id, "active"); onOpenChange(false); }}>
              <Play className="h-4 w-4 mr-2" />Retomar
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => { onDelete(campaign.id); onOpenChange(false); }}>
            <Trash2 className="h-4 w-4 mr-2" />Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Campanhas() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState<ChannelType>("email");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [recipientsText, setRecipientsText] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const {
    campaigns,
    isLoading,
    createCampaign,
    dispatchCampaign,
    deleteCampaign,
    updateCampaignStatus,
  } = useCampaigns();

  const resetForm = () => {
    setName(""); setDescription(""); setChannel("email");
    setSubject(""); setContent(""); setRecipientsText(""); setScheduledAt("");
  };

  const parseRecipients = (text: string): CampaignRecipient[] => {
    return text.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
      const parts = line.split(",").map(p => p.trim());
      if (channel === "email") return { name: parts[1] || undefined, email: parts[0] };
      return { name: parts[1] || undefined, phone: parts[0] };
    });
  };

  const handleCreate = () => {
    const recipients = parseRecipients(recipientsText);
    if (!name || !content || recipients.length === 0) return;
    createCampaign.mutate(
      { name, description, channel, subject: channel === "email" ? subject : undefined, content, recipients, scheduled_at: scheduledAt || undefined },
      { onSuccess: () => { setCreateDialogOpen(false); resetForm(); } }
    );
  };

  const filtered = activeTab === "all" ? campaigns : campaigns.filter((c: any) => c.status === activeTab);

  const tabCounts = (key: string) => {
    if (key === "all") return campaigns.length;
    return campaigns.filter((c: any) => c.status === key).length;
  };

  return (
    <MainLayout>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">Campanhas</h1>
            <p className="text-muted-foreground">Gerenciamento de campanhas e comunicações ativas</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Nova Campanha
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              {tabs.map(t => (
                <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                  {t.label}
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 min-w-[20px]">
                    {tabCounts(t.key)}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map(t => (
              <TabsContent key={t.key} value={t.key}>
                {filtered.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <p>Nenhuma campanha encontrada.</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead className="w-[100px]">Canal</TableHead>
                          <TableHead className="w-[110px]">Status</TableHead>
                          <TableHead className="w-[80px] text-center">Dest.</TableHead>
                          <TableHead className="w-[100px] text-center">Progresso</TableHead>
                          <TableHead className="w-[120px]">Criada em</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((c: any) => {
                          const ch = c.channel as ChannelType;
                          const st = c.status as StatusType;
                          const prog = c.total_recipients > 0 ? Math.round((c.delivered / c.total_recipients) * 100) : 0;
                          return (
                            <TableRow
                              key={c.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => { setSelectedCampaign(c); setDetailOpen(true); }}
                            >
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{c.name}</p>
                                  {c.description && <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-sm">
                                  {channelIcons[ch]}
                                  {channelLabels[ch]}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={`text-xs ${statusBadgeVariant[st]}`}>{statusLabels[st]}</Badge>
                              </TableCell>
                              <TableCell className="text-center text-sm">{c.total_recipients}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress value={prog} className="h-1.5 flex-1" />
                                  <span className="text-xs text-muted-foreground w-8">{prog}%</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(c.created_at), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedCampaign(c); setDetailOpen(true); }}>
                                      <Eye className="h-4 w-4 mr-2" />Ver detalhes
                                    </DropdownMenuItem>
                                    {c.status === "draft" && (
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); dispatchCampaign.mutate(c.id); }}>
                                        <Send className="h-4 w-4 mr-2" />Disparar
                                      </DropdownMenuItem>
                                    )}
                                    {c.status === "active" && (
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateCampaignStatus.mutate({ id: c.id, status: "paused" }); }}>
                                        <Pause className="h-4 w-4 mr-2" />Pausar
                                      </DropdownMenuItem>
                                    )}
                                    {c.status === "paused" && (
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateCampaignStatus.mutate({ id: c.id, status: "active" }); }}>
                                        <Play className="h-4 w-4 mr-2" />Retomar
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteCampaign.mutate(c.id); }}>
                                      <Trash2 className="h-4 w-4 mr-2" />Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      {/* Modal detalhes */}
      <CampaignDetailModal
        campaign={selectedCampaign}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDispatch={(id) => dispatchCampaign.mutate(id)}
        onDelete={(id) => deleteCampaign.mutate(id)}
        onPause={(id, status) => updateCampaignStatus.mutate({ id, status })}
        isDispatching={dispatchCampaign.isPending}
      />

      {/* Dialog Nova Campanha */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Campanha</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Campanha</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Newsletter Junho" />
              </div>
              <div className="space-y-2">
                <Label>Canal</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as ChannelType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email"><span className="flex items-center gap-2"><Mail className="h-4 w-4" />Email (Resend)</span></SelectItem>
                    <SelectItem value="sms"><span className="flex items-center gap-2"><Phone className="h-4 w-4" />SMS (Twilio)</span></SelectItem>
                    <SelectItem value="whatsapp" disabled><span className="flex items-center gap-2"><MessageSquare className="h-4 w-4" />WhatsApp (Em breve)</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descrição da campanha" />
            </div>

            {channel === "email" && (
              <div className="space-y-2">
                <Label>Assunto do Email</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto do email" />
              </div>
            )}

            <div className="space-y-2">
              <Label>{channel === "email" ? "Conteúdo HTML" : "Mensagem"}</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={channel === "email" ? "<h1>Olá!</h1><p>Sua mensagem aqui...</p>" : "Olá! Esta é sua mensagem..."}
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Destinatários{" "}
                <span className="text-muted-foreground text-xs">
                  ({channel === "email" ? "email, nome" : "telefone, nome"} — um por linha)
                </span>
              </Label>
              <Textarea
                value={recipientsText}
                onChange={(e) => setRecipientsText(e.target.value)}
                placeholder={channel === "email"
                  ? "joao@email.com, João Silva\nmaria@email.com, Maria Santos"
                  : "+5511999999999, João Silva\n+5511888888888, Maria Santos"}
                rows={4}
              />
              {recipientsText && (
                <p className="text-xs text-muted-foreground">{parseRecipients(recipientsText).length} destinatário(s)</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Agendar para (opcional)</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              <p className="text-xs text-muted-foreground">Deixe vazio para salvar como rascunho e disparar manualmente.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!name || !content || !recipientsText || createCampaign.isPending}>
              {createCampaign.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {scheduledAt ? "Agendar" : "Criar Rascunho"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
