import { useState, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { IntegracoesTutorial } from "@/components/integrations/IntegracoesTutorial";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Copy,
  Check,
  Plug,
  Webhook,
  FileCode,
  Key,
  ExternalLink,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  Database,
  Shield,
  Zap,
  MessageSquare,
  Phone,
  Bot,
  Brain,
  Mail,
  Mic,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Info,
  BookOpen,
  Code2,
  Server,
  Lock,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { EmailSetupGuide } from "@/components/integrations/EmailSetupGuide";
import { useRole } from "@/hooks/useRole";

const SUPABASE_PROJECT_ID = "udyjlesjcgxhgdiaptjp";
const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWpsZXNqY2d4aGdkaWFwdGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNzQ1ODIsImV4cCI6MjA4NDg1MDU4Mn0.RrxAI4hEnYKipq68oLTl7l0-2UBr0gmYGVHZwHnOOIs";

// Edge Functions reais do projeto
const edgeFunctions = [
  {
    name: "complaint-ai-triage",
    method: "POST",
    description: "Realiza triagem automática com IA (sentimento, urgência, cenário) de uma solicitação.",
    auth: "Anon Key",
    bodyParams: [
      { name: "complaint_id", type: "string", required: true, desc: "ID da solicitação a ser analisada" },
      { name: "description", type: "string", required: true, desc: "Texto/descrição da solicitação" },
      { name: "type", type: "string", required: false, desc: "Tipo: reclamacao, denuncia, sugestao, elogio" },
      { name: "category", type: "string", required: false, desc: "Categoria da solicitação" },
      { name: "channel", type: "string", required: false, desc: "Canal de origem: web, voice, phone" },
      { name: "reporter_name", type: "string", required: false, desc: "Nome do solicitante" },
      { name: "is_anonymous", type: "boolean", required: false, desc: "Se é anônimo" },
    ],
    responseExample: `{
  "triage": {
    "sentiment": "frustrado",
    "urgency": "alta",
    "scenario_summary": "Cliente relata atraso na entrega...",
    "risk_factors": ["prazo excedido", "sem retorno"],
    "recommended_action": "Priorizar contato imediato"
  }
}`,
    category: "IA",
  },
  {
    name: "monitoring-ai-analysis",
    method: "POST",
    description: "Gera análises e relatórios de monitoramento com IA com base em métricas de atendimento.",
    auth: "Anon Key",
    bodyParams: [
      { name: "metrics", type: "object", required: true, desc: "Objeto com métricas de atendimento" },
      { name: "type", type: "string", required: false, desc: "'report' para relatório completo ou omitir para análise curta" },
    ],
    responseExample: `{
  "analysis": "O volume de atendimentos cresceu 15%..."
}`,
    category: "IA",
  },
  {
    name: "chatbot-public",
    method: "POST",
    description: "Endpoint público do chatbot para interação com usuários finais (widget de página ou WhatsApp).",
    auth: "Nenhuma (público)",
    bodyParams: [
      { name: "message", type: "string", required: true, desc: "Mensagem do usuário" },
      { name: "session_id", type: "string", required: false, desc: "ID da sessão para manter contexto" },
      { name: "flow_id", type: "string", required: false, desc: "ID do fluxo do chatbot a usar" },
      { name: "channel", type: "string", required: false, desc: "Canal: webchat ou whatsapp" },
    ],
    responseExample: `{
  "response": "Olá! Como posso ajudar?",
  "options": [
    { "key": "1", "text": "Fazer uma reclamação" },
    { "key": "2", "text": "Acompanhar solicitação" }
  ],
  "session_id": "abc-123"
}`,
    category: "Chatbot",
  },
  {
    name: "chatbot-admin",
    method: "POST",
    description: "Gerenciamento administrativo de fluxos do chatbot (criar, editar, deletar nós e opções).",
    auth: "Anon Key (autenticado)",
    bodyParams: [
      { name: "action", type: "string", required: true, desc: "Ação: create_flow, update_node, delete_node, etc." },
      { name: "data", type: "object", required: true, desc: "Dados da ação conforme tipo" },
    ],
    responseExample: `{
  "success": true,
  "flow": { "id": "...", "name": "Fluxo Principal" }
}`,
    category: "Chatbot",
  },
  {
    name: "whatsapp-webhook",
    method: "POST",
    description: "Recebe mensagens do WhatsApp via Evolution API / Meta API e processa no chatbot.",
    auth: "Nenhuma (webhook)",
    bodyParams: [
      { name: "—", type: "—", required: true, desc: "Payload automático do provedor WhatsApp" },
    ],
    responseExample: `{ "status": "processed" }`,
    category: "WhatsApp",
  },
  {
    name: "whatsapp-send",
    method: "POST",
    description: "Envia mensagens pelo WhatsApp via Evolution API.",
    auth: "Anon Key",
    bodyParams: [
      { name: "phone", type: "string", required: true, desc: "Número do destinatário (ex: 5511999998888)" },
      { name: "message", type: "string", required: true, desc: "Texto da mensagem" },
    ],
    responseExample: `{ "success": true, "message_id": "..." }`,
    category: "WhatsApp",
  },
  {
    name: "send-complaint-email",
    method: "POST",
    description: "Envia e-mail de confirmação/notificação sobre uma solicitação registrada, via Resend.",
    auth: "Nenhuma (público)",
    bodyParams: [
      { name: "to", type: "string", required: true, desc: "E-mail do destinatário" },
      { name: "protocol", type: "string", required: true, desc: "Número de protocolo" },
      { name: "type", type: "string", required: true, desc: "Tipo da solicitação" },
      { name: "description", type: "string", required: true, desc: "Descrição resumida" },
    ],
    responseExample: `{ "success": true }`,
    category: "E-mail",
  },
  {
    name: "elevenlabs-conversation-token",
    method: "POST",
    description: "Gera token de sessão WebRTC para o agente de voz ElevenLabs.",
    auth: "Nenhuma (público)",
    bodyParams: [],
    responseExample: `{ "conversation_id": "...", "signed_url": "wss://..." }`,
    category: "Voz",
  },
  {
    name: "voice-agent-tools",
    method: "POST",
    description: "Server tools do agente de voz ElevenLabs (registrar solicitação via Twilio/telefone).",
    auth: "Nenhuma (webhook ElevenLabs)",
    bodyParams: [
      { name: "tool_name", type: "string", required: true, desc: "Nome da ferramenta: registrarSolicitacao" },
      { name: "parameters", type: "object", required: true, desc: "Parâmetros da ferramenta" },
    ],
    responseExample: `{
  "result": {
    "protocol": "REC-2026-000001",
    "success": true
  }
}`,
    category: "Voz",
  },
];

// Tabelas principais do banco de dados
const mainTables = [
  { name: "complaints", desc: "Solicitações, reclamações e denúncias registradas", cols: "id, protocol_number, type, category, status, description, channel, ai_triage, reporter_name, ..." },
  { name: "service_queue", desc: "Fila unificada de atendimento (todos os canais)", cols: "id, channel, status, priority, customer_name, subject, last_message, complaint_id, waiting_since, ..." },
  { name: "chatbot_flows", desc: "Fluxos de chatbot configurados", cols: "id, name, description, channel, is_active, is_default" },
  { name: "chatbot_nodes", desc: "Nós/etapas dos fluxos do chatbot", cols: "id, flow_id, name, node_type, content, action_type, action_config, ..." },
  { name: "chatbot_node_options", desc: "Opções de resposta de cada nó", cols: "id, node_id, option_key, option_text, next_node_id" },
  { name: "workflows", desc: "Fluxos de trabalho (BPM) para gestão de processos", cols: "id, name, workflow_type, is_active, steps (relation)" },
  { name: "workflow_steps", desc: "Etapas dos fluxos de trabalho", cols: "id, workflow_id, name, step_order, responsible_role" },
  { name: "attendant_profiles", desc: "Perfis dos atendentes com status online/offline", cols: "id, user_id, full_name, email, status, phone" },
  { name: "complaint_audit_log", desc: "Log de auditoria de alterações em solicitações", cols: "id, complaint_id, action, field_changed, old_value, new_value, user_email" },
  { name: "admin_users", desc: "Usuários administrativos do sistema", cols: "id, user_id, email, role" },
  { name: "chatbot_analytics", desc: "Analytics de interações do chatbot", cols: "id, phone_number, message_type, user_message, bot_response, response_time_ms" },
];

// Integrações externas reais
const realIntegrations = [
  {
    name: "WhatsApp (Evolution API)",
    description: "Envio e recebimento de mensagens via WhatsApp Business. Configurado com Evolution API.",
    status: "configured",
    icon: <MessageSquare className="h-5 w-5 text-green-500" />,
    secrets: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_ID", "WHATSAPP_VERIFY_TOKEN", "EVOLUTION_API_URL", "EVOLUTION_API_KEY", "EVOLUTION_INSTANCE_NAME"],
    docs: "Webhook configurado em whatsapp-webhook. Envio via whatsapp-send.",
  },
  {
    name: "ElevenLabs (Agente de Voz)",
    description: "Agente de voz com IA para atendimento via web e telefone (Twilio).",
    status: "configured",
    icon: <Mic className="h-5 w-5 text-purple-500" />,
    secrets: ["ELEVENLABS_API_KEY"],
    docs: "Agent ID: agent_2001kfzvc45yfwstqcvp7a43kc59. Token via elevenlabs-conversation-token.",
  },
  {
    name: "Resend (E-mail)",
    description: "Envio de e-mails transacionais (confirmação de protocolo, notificações).",
    status: "configured",
    icon: <Mail className="h-5 w-5 text-blue-500" />,
    secrets: ["RESEND_API_KEY", "RESEND_FROM"],
    docs: "Usado em send-complaint-email para notificações automáticas.",
  },
  {
    name: "Lovable AI Gateway",
    description: "Gateway IA para triagem automática, análises e relatórios (Gemini / GPT).",
    status: "configured",
    icon: <Brain className="h-5 w-5 text-amber-500" />,
    secrets: ["LOVABLE_API_KEY"],
    docs: "Usado em complaint-ai-triage e monitoring-ai-analysis.",
  },
  {
    name: "reCAPTCHA v3",
    description: "Proteção anti-bot no formulário público de solicitações.",
    status: "configured",
    icon: <Shield className="h-5 w-5 text-teal-500" />,
    secrets: ["RECAPTCHA_SECRET_KEY", "RECAPTCHA_GCP_API_KEY"],
    docs: "Validação no frontend e backend para formulário público.",
  },
  {
    name: "Supabase Auth",
    description: "Autenticação de usuários administrativos e atendentes.",
    status: "configured",
    icon: <Lock className="h-5 w-5 text-emerald-500" />,
    secrets: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    docs: "Login via email/senha. Controle de roles: admin e atendente.",
  },
];

const categoryColors: Record<string, string> = {
  "IA": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "Chatbot": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "WhatsApp": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "E-mail": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Voz": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
};

export default function Integracoes() {
  const { toast } = useToast();
  const { role } = useRole();
  const [copied, setCopied] = useState<string | null>(null);
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const isAdmin = role === 'admin';

  // For non-admin users, show only the email integration guide
  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="mb-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-1">Integrações</h1>
            <p className="text-muted-foreground">
              Configure sua integração de email para receber e enviar mensagens pela plataforma
            </p>
          </div>
          <EmailSetupGuide />
        </div>
      </MainLayout>
    );
  }

  const handleTutorialTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast({ title: "Copiado!", description: "Conteúdo copiado para a área de transferência." });
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(text, id)}>
      {copied === id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </Button>
  );

  const filteredFunctions = selectedCategory
    ? edgeFunctions.filter(f => f.category === selectedCategory)
    : edgeFunctions;

  const categories = [...new Set(edgeFunctions.map(f => f.category))];

  // Exemplos de código reais
  const exampleCurl = `curl -X POST "${SUPABASE_URL}/functions/v1/complaint-ai-triage" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${ANON_KEY.slice(0, 20)}..." \\
  -d '{
    "complaint_id": "uuid-da-solicitacao",
    "description": "Meu pedido não chegou no prazo",
    "type": "reclamacao",
    "category": "Serviço"
  }'`;

  const exampleJS = `import { supabase } from "@/integrations/supabase/client";

// Chamar Edge Function via Supabase SDK
const { data, error } = await supabase.functions.invoke(
  "complaint-ai-triage",
  {
    body: {
      complaint_id: "uuid-da-solicitacao",
      description: "Meu pedido não chegou no prazo",
      type: "reclamacao",
      category: "Serviço",
    },
  }
);

if (error) console.error("Erro:", error);
console.log("Triagem:", data.triage);`;

  const examplePython = `import requests

SUPABASE_URL = "${SUPABASE_URL}"
ANON_KEY = "sua-anon-key"

response = requests.post(
    f"{SUPABASE_URL}/functions/v1/complaint-ai-triage",
    headers={
        "Authorization": f"Bearer {ANON_KEY}",
        "Content-Type": "application/json",
    },
    json={
        "complaint_id": "uuid-da-solicitacao",
        "description": "Meu pedido não chegou no prazo",
        "type": "reclamacao",
        "category": "Serviço",
    },
)

data = response.json()
print("Triagem:", data["triage"])`;

  const exampleRealtime = `import { supabase } from "@/integrations/supabase/client";

// Escutar mudanças em tempo real na fila de atendimento
const channel = supabase
  .channel("queue-changes")
  .on(
    "postgres_changes",
    {
      event: "*",               // INSERT, UPDATE, DELETE
      schema: "public",
      table: "service_queue",
    },
    (payload) => {
      console.log("Mudança na fila:", payload);
      // payload.new = novo registro
      // payload.old = registro anterior
      // payload.eventType = "INSERT" | "UPDATE" | "DELETE"
    }
  )
  .subscribe();

// Para parar de escutar:
// supabase.removeChannel(channel);`;

  return (
    <MainLayout>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">Integrações</h1>
            <p className="text-muted-foreground">
              Documentação completa da API, Edge Functions, banco de dados e integrações externas da plataforma Metadesk
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setTutorialOpen(true)}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              Tutorial
            </Button>
            <Badge variant="outline" className="gap-1.5 text-xs" data-tutorial="supabase-badge">
              <Server className="h-3 w-3" />
              Supabase: {SUPABASE_PROJECT_ID}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs" data-tutorial="tab-overview">
              <BookOpen className="h-3.5 w-3.5" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="functions" className="flex items-center gap-1.5 text-xs" data-tutorial="tab-functions">
              <Zap className="h-3.5 w-3.5" />
              Edge Functions
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-1.5 text-xs" data-tutorial="tab-database">
              <Database className="h-3.5 w-3.5" />
              Banco de Dados
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-1.5 text-xs" data-tutorial="tab-integrations">
              <Plug className="h-3.5 w-3.5" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="examples" className="flex items-center gap-1.5 text-xs" data-tutorial="tab-examples">
              <Code2 className="h-3.5 w-3.5" />
              Exemplos
            </TabsTrigger>
          </TabsList>

          {/* ===== VISÃO GERAL ===== */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Arquitetura */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Arquitetura da Plataforma
                </CardTitle>
                <CardDescription>
                  O Metadesk é construído sobre Supabase (PostgreSQL + Edge Functions + Realtime + Auth) com frontend React/Vite.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                    <div className="flex items-center gap-2 font-medium">
                      <Server className="h-4 w-4 text-primary" />
                      Backend
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {edgeFunctions.length} Edge Functions serverless (Deno) para lógica de negócio, IA e integrações externas.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                    <div className="flex items-center gap-2 font-medium">
                      <Database className="h-4 w-4 text-primary" />
                      Banco de Dados
                    </div>
                    <p className="text-sm text-muted-foreground">
                      PostgreSQL com {mainTables.length}+ tabelas, RLS (Row Level Security), triggers e funções SQL.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                    <div className="flex items-center gap-2 font-medium">
                      <Zap className="h-4 w-4 text-primary" />
                      Realtime
                    </div>
                    <p className="text-sm text-muted-foreground">
                      WebSockets para atualização em tempo real da fila de atendimento e notificações.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* URLs base */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">URLs Base</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-muted rounded-lg p-3 font-mono text-sm">
                      <div>
                        <span className="text-muted-foreground mr-2">API REST:</span>
                        <span>{SUPABASE_URL}/rest/v1/</span>
                      </div>
                      <CopyBtn text={`${SUPABASE_URL}/rest/v1/`} id="rest-url" />
                    </div>
                    <div className="flex items-center justify-between bg-muted rounded-lg p-3 font-mono text-sm">
                      <div>
                        <span className="text-muted-foreground mr-2">Edge Functions:</span>
                        <span>{SUPABASE_URL}/functions/v1/</span>
                      </div>
                      <CopyBtn text={`${SUPABASE_URL}/functions/v1/`} id="func-url" />
                    </div>
                    <div className="flex items-center justify-between bg-muted rounded-lg p-3 font-mono text-sm">
                      <div>
                        <span className="text-muted-foreground mr-2">Realtime:</span>
                        <span>wss://{SUPABASE_PROJECT_ID}.supabase.co/realtime/v1</span>
                      </div>
                      <CopyBtn text={`wss://${SUPABASE_PROJECT_ID}.supabase.co/realtime/v1`} id="rt-url" />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Autenticação */}
                <div className="space-y-3" data-tutorial="auth-section">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Autenticação</h3>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <p className="text-sm">
                      Todas as requisições à API REST e Edge Functions (exceto endpoints públicos) requerem o header:
                    </p>
                    <div className="bg-zinc-900 text-zinc-100 rounded-lg p-3 font-mono text-sm">
                      Authorization: Bearer {"<"}anon_key ou user_jwt{">"}
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-800 dark:text-amber-200">
                        A <strong>Anon Key</strong> é pública e segura para uso no frontend. Para operações privilegiadas, use o JWT do usuário autenticado. <strong>Nunca exponha a Service Role Key</strong> no cliente.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Anon Key (Pública)</Label>
                      <div className="flex items-center gap-2 bg-muted rounded-lg p-2">
                        <code className="font-mono text-xs flex-1 break-all">
                          {showAnonKey ? ANON_KEY : ANON_KEY.slice(0, 30) + "..."}
                        </code>
                        <Button variant="ghost" size="sm" onClick={() => setShowAnonKey(!showAnonKey)}>
                          {showAnonKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <CopyBtn text={ANON_KEY} id="anon-key" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== EDGE FUNCTIONS ===== */}
          <TabsContent value="functions" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Edge Functions ({edgeFunctions.length})
                    </CardTitle>
                    <CardDescription>
                      Funções serverless em Deno. Deploy automático. Chamadas via POST para {SUPABASE_URL}/functions/v1/{"<nome>"}
                    </CardDescription>
                  </div>
                  <a
                    href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/functions`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Dashboard
                    </Button>
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                {/* Category filter */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <Button
                    variant={selectedCategory === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                  >
                    Todas
                  </Button>
                  {categories.map(cat => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>

                <Accordion type="single" collapsible className="w-full">
                  {filteredFunctions.map((fn) => (
                    <AccordionItem key={fn.name} value={fn.name}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-mono text-xs">
                            {fn.method}
                          </Badge>
                          <code className="font-mono text-sm">/functions/v1/{fn.name}</code>
                          <Badge className={`text-[10px] ${categoryColors[fn.category] || ""}`}>
                            {fn.category}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {fn.auth}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{fn.description}</p>

                        {/* URL completa */}
                        <div className="flex items-center gap-2 bg-muted rounded-lg p-2 font-mono text-xs">
                          <span className="flex-1">{SUPABASE_URL}/functions/v1/{fn.name}</span>
                          <CopyBtn text={`${SUPABASE_URL}/functions/v1/${fn.name}`} id={`url-${fn.name}`} />
                        </div>

                        {/* Parâmetros */}
                        {fn.bodyParams.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Parâmetros (Body JSON)</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[150px]">Parâmetro</TableHead>
                                  <TableHead className="w-[80px]">Tipo</TableHead>
                                  <TableHead className="w-[90px]">Obrigatório</TableHead>
                                  <TableHead>Descrição</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {fn.bodyParams.map(p => (
                                  <TableRow key={p.name}>
                                    <TableCell className="font-mono text-xs">{p.name}</TableCell>
                                    <TableCell className="text-xs">{p.type}</TableCell>
                                    <TableCell>
                                      {p.required ? (
                                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-[10px]">Sim</Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-[10px]">Não</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{p.desc}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}

                        {/* Resposta exemplo */}
                        <div>
                          <h4 className="text-sm font-medium mb-2">Exemplo de Resposta</h4>
                          <div className="relative">
                            <pre className="bg-zinc-900 text-zinc-100 rounded-lg p-4 overflow-x-auto text-xs">
                              <code>{fn.responseExample}</code>
                            </pre>
                            <CopyBtn text={fn.responseExample} id={`resp-${fn.name}`} />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== BANCO DE DADOS ===== */}
          <TabsContent value="database" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Tabelas Principais
                    </CardTitle>
                    <CardDescription>
                      Estrutura do PostgreSQL. Acesso via REST em {SUPABASE_URL}/rest/v1/{"<tabela>"} com Anon Key.
                    </CardDescription>
                  </div>
                  <a
                    href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/sql/new`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      SQL Editor
                    </Button>
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mainTables.map(t => (
                    <div key={t.name} className="p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="font-mono text-sm font-medium text-primary">{t.name}</code>
                        <CopyBtn text={`${SUPABASE_URL}/rest/v1/${t.name}`} id={`table-${t.name}`} />
                      </div>
                      <p className="text-sm text-muted-foreground">{t.desc}</p>
                      <p className="text-xs text-muted-foreground/70 font-mono mt-1">{t.cols}</p>
                    </div>
                  ))}
                </div>

                <Separator className="my-6" />

                {/* Realtime */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Supabase Realtime
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    As tabelas <code className="text-primary">service_queue</code>, <code className="text-primary">complaints</code> e <code className="text-primary">chatbot_analytics</code> têm Realtime habilitado. Use Postgres Changes para escutar INSERT, UPDATE e DELETE em tempo real via WebSocket.
                  </p>
                  <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      A fila de atendimento (<code>service_queue</code>) é atualizada automaticamente a cada novo item, sem necessidade de polling.
                    </p>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* RLS */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Row Level Security (RLS)
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    As tabelas utilizam políticas de RLS que controlam o acesso por função (admin/atendente) ou acesso público (formulário de reclamações, chatbot). Consulte o dashboard do Supabase para detalhes das políticas de cada tabela.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== INTEGRAÇÕES EXTERNAS ===== */}
          <TabsContent value="integrations" className="mt-6 space-y-6">
            {/* Email Setup Guide */}
            <EmailSetupGuide />

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {realIntegrations.map((integration) => (
                <Card key={integration.name}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {integration.icon}
                        <div>
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                          <CardDescription className="text-xs">{integration.description}</CardDescription>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Configurado
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">{integration.docs}</p>
                    <div>
                      <Label className="text-xs text-muted-foreground">Secrets configuradas:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {integration.secrets.map(s => (
                          <Badge key={s} variant="outline" className="text-[10px] font-mono">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Webhooks Ativos
                </CardTitle>
                <CardDescription>
                  Endpoints que recebem dados de serviços externos automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 font-mono text-xs">POST</Badge>
                      <code className="font-mono text-sm">/functions/v1/whatsapp-webhook</code>
                    </div>
                    <Badge className="bg-green-100 text-green-800 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Ativo
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recebe mensagens do WhatsApp via Evolution API. Rota pública (sem JWT). Configure a URL completa no painel do provedor WhatsApp.
                  </p>
                  <div className="flex items-center gap-2 bg-muted rounded-lg p-2 mt-2 font-mono text-xs">
                    <span className="flex-1">{SUPABASE_URL}/functions/v1/whatsapp-webhook</span>
                    <CopyBtn text={`${SUPABASE_URL}/functions/v1/whatsapp-webhook`} id="wh-url" />
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 font-mono text-xs">POST</Badge>
                      <code className="font-mono text-sm">/functions/v1/voice-agent-tools</code>
                    </div>
                    <Badge className="bg-green-100 text-green-800 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Ativo
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Webhook do agente de voz ElevenLabs para registrar solicitações via Twilio (telefone). Chamado automaticamente pela ferramenta <code>registrarSolicitacao</code>.
                  </p>
                  <div className="flex items-center gap-2 bg-muted rounded-lg p-2 mt-2 font-mono text-xs">
                    <span className="flex-1">{SUPABASE_URL}/functions/v1/voice-agent-tools</span>
                    <CopyBtn text={`${SUPABASE_URL}/functions/v1/voice-agent-tools`} id="va-url" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== EXEMPLOS DE CÓDIGO ===== */}
          <TabsContent value="examples" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Exemplos de Código
                </CardTitle>
                <CardDescription>
                  Copie e cole para integrar com a plataforma Metadesk
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Triagem IA */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Triagem IA de Solicitações
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Chame a edge function para obter análise automática de sentimento, urgência e cenário.
                  </p>
                  <Tabs defaultValue="curl" className="w-full">
                    <TabsList>
                      <TabsTrigger value="curl">cURL</TabsTrigger>
                      <TabsTrigger value="javascript">JavaScript (SDK)</TabsTrigger>
                      <TabsTrigger value="python">Python</TabsTrigger>
                    </TabsList>
                    {[
                      { key: "curl", code: exampleCurl },
                      { key: "javascript", code: exampleJS },
                      { key: "python", code: examplePython },
                    ].map(({ key, code }) => (
                      <TabsContent key={key} value={key}>
                        <div className="relative">
                          <pre className="bg-zinc-900 text-zinc-100 rounded-lg p-4 overflow-x-auto text-xs">
                            <code>{code}</code>
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-100"
                            onClick={() => copyToClipboard(code, `ex-${key}`)}
                          >
                            {copied === `ex-${key}` ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>

                <Separator />

                {/* Realtime */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Escutar Fila de Atendimento (Realtime)
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Use Supabase Realtime para receber notificações instantâneas quando novos atendimentos chegarem na fila.
                  </p>
                  <div className="relative">
                    <pre className="bg-zinc-900 text-zinc-100 rounded-lg p-4 overflow-x-auto text-xs">
                      <code>{exampleRealtime}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-100"
                      onClick={() => copyToClipboard(exampleRealtime, "ex-rt")}
                    >
                      {copied === "ex-rt" ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* REST API */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Consultar Solicitações (REST API)
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Acesse dados diretamente via PostgREST. Suporta filtros, paginação e ordenação.
                  </p>
                  <Tabs defaultValue="curl-rest">
                    <TabsList>
                      <TabsTrigger value="curl-rest">cURL</TabsTrigger>
                      <TabsTrigger value="js-rest">JavaScript (SDK)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="curl-rest">
                      <div className="relative">
                        <pre className="bg-zinc-900 text-zinc-100 rounded-lg p-4 overflow-x-auto text-xs">
                          <code>{`# Listar solicitações com status "novo", ordenadas por data
curl "${SUPABASE_URL}/rest/v1/complaints?status=eq.novo&order=created_at.desc&limit=20" \\
  -H "apikey: ${ANON_KEY.slice(0, 20)}..." \\
  -H "Authorization: Bearer ${ANON_KEY.slice(0, 20)}..."

# Buscar uma solicitação específica
curl "${SUPABASE_URL}/rest/v1/complaints?id=eq.UUID_AQUI&select=*" \\
  -H "apikey: ${ANON_KEY.slice(0, 20)}..." \\
  -H "Authorization: Bearer ${ANON_KEY.slice(0, 20)}..."`}</code>
                        </pre>
                      </div>
                    </TabsContent>
                    <TabsContent value="js-rest">
                      <div className="relative">
                        <pre className="bg-zinc-900 text-zinc-100 rounded-lg p-4 overflow-x-auto text-xs">
                          <code>{`import { supabase } from "@/integrations/supabase/client";

// Listar solicitações novas
const { data, error } = await supabase
  .from("complaints")
  .select("*")
  .eq("status", "novo")
  .order("created_at", { ascending: false })
  .limit(20);

// Inserir na fila de atendimento
const { data: queueItem } = await supabase
  .from("service_queue")
  .insert({
    channel: "web",
    status: "waiting",
    customer_name: "João Silva",
    subject: "Reclamação sobre entrega",
    priority: 2,
  })
  .select()
  .single();`}</code>
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <Separator />

                {/* Status codes */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Códigos de Resposta HTTP</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { code: "200", label: "Sucesso", color: "bg-green-50 border-green-200 text-green-700" },
                      { code: "201", label: "Criado", color: "bg-blue-50 border-blue-200 text-blue-700" },
                      { code: "401", label: "Não autorizado", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
                      { code: "402", label: "Créditos insuficientes", color: "bg-orange-50 border-orange-200 text-orange-700" },
                      { code: "429", label: "Rate limit", color: "bg-red-50 border-red-200 text-red-700" },
                    ].map(c => (
                      <div key={c.code} className={`p-3 rounded-lg border ${c.color}`}>
                        <span className="font-mono font-bold">{c.code}</span>
                        <p className="text-xs mt-0.5">{c.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <IntegracoesTutorial
        isOpen={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        onChangeTab={handleTutorialTabChange}
      />
    </MainLayout>
  );
}
