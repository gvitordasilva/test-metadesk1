import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  BookOpen,
  Search,
  MessageSquare,
  ClipboardList,
  BarChart3,
  Settings,
  Plug,
  Megaphone,
  Book,
  Home,
  ChevronRight,
  Play,
  CheckCircle2,
  Lightbulb,
  Shield,
  Users,
  Bot,
  FileText,
  Workflow,
  Bell,
  Globe,
} from "lucide-react";

// ============ FAQ DATA ============

type FaqItem = {
  question: string;
  answer: string;
};

type FaqCategory = {
  title: string;
  icon: React.ElementType;
  items: FaqItem[];
};

const faqCategories: FaqCategory[] = [
  {
    title: "Visão Geral da Plataforma",
    icon: Home,
    items: [
      {
        question: "O que é o Metadesk?",
        answer:
          "O Metadesk é uma plataforma omnichannel de atendimento e gestão de solicitações. Ele reúne atendimento via WhatsApp e webchat, gestão de reclamações, denúncias e sugestões, campanhas de comunicação, base de conhecimento e monitoramento com indicadores e IA — tudo em um único painel.",
      },
      {
        question: "Quais são os módulos disponíveis?",
        answer:
          "A plataforma possui 6 pilares: (1) Atendimento Omnichannel, (2) Orquestração de Solicitações e Fluxos (BPM), (3) Base de Conhecimento com IA, (4) Campanhas e Comunicação, (5) Monitoramento e Indicadores (MINP), e (6) Administração e Governança.",
      },
      {
        question: "Quais perfis de acesso existem?",
        answer:
          'Existem dois perfis: "Admin" (acesso total incluindo dashboard, administração, campanhas e integrações) e "Atendente" (acesso ao atendimento, solicitações, conteúdo e monitoramento). Os perfis são gerenciados na Administração.',
      },
    ],
  },
  {
    title: "Atendimento Omnichannel",
    icon: MessageSquare,
    items: [
      {
        question: "Quais canais de atendimento estão disponíveis?",
        answer:
          "O Metadesk suporta atendimento via WhatsApp (integração com Evolution API) e Webchat (widget incorporável em páginas web). Ambos os canais são unificados em uma fila centralizada.",
      },
      {
        question: "Como funciona a fila de atendimento?",
        answer:
          "As conversas chegam automaticamente pela fila e são distribuídas aos atendentes online. O atendente pode visualizar o histórico completo, enviar mensagens, transferir atendimentos e encerrar sessões. O indicador de sentimento mostra o humor do cliente em tempo real.",
      },
      {
        question: "O que são mensagens rápidas?",
        answer:
          'São respostas pré-configuradas que agilizam o atendimento. Podem ser acessadas pelo ícone de "raio" na barra de ferramentas da conversa. Os administradores podem criar e gerenciar mensagens rápidas na seção de Conteúdo.',
      },
      {
        question: "Como transferir um atendimento?",
        answer:
          "Na conversa ativa, clique no botão de transferência na barra de ferramentas. Selecione o atendente de destino e adicione uma observação opcional. O atendente receptor receberá a conversa com todo o histórico.",
      },
    ],
  },
  {
    title: "Solicitações e Fluxos",
    icon: ClipboardList,
    items: [
      {
        question: "Quais tipos de solicitação podem ser registrados?",
        answer:
          "São quatro tipos: Reclamação, Denúncia, Sugestão e Elogio. Cada uma pode ser categorizada (Atendimento, Produto, Serviço, Infraestrutura, Financeiro, RH, Segurança, Meio Ambiente, Outro) e receber um fluxo de trabalho específico.",
      },
      {
        question: "O que é a reclassificação de solicitações?",
        answer:
          "Permite alterar o tipo, categoria e fluxo de trabalho de uma solicitação já registrada. Todas as alterações são registradas no histórico de auditoria com data, hora e valores anteriores/novos.",
      },
      {
        question: "Como funcionam os fluxos de trabalho (BPM)?",
        answer:
          "Os fluxos de trabalho são sequências de etapas que definem o caminho de resolução de uma solicitação. Cada etapa possui um responsável, SLA e descrição. Eles são criados na aba 'Estrutura' da Administração e podem ser vinculados a solicitações.",
      },
      {
        question: "As solicitações podem ser anônimas?",
        answer:
          "Sim. O formulário público de reclamações/denúncias permite que o solicitante opte por anonimato. Neste caso, os dados pessoais não são armazenados e não são exibidos no painel interno.",
      },
    ],
  },
  {
    title: "Chatbot",
    icon: Bot,
    items: [
      {
        question: "Como criar um chatbot?",
        answer:
          'Na Administração, acesse a aba "Chatbot". Clique em "Novo Fluxo", defina o nome, descrição e canal (WhatsApp, Widget de Página ou Todos). O editor visual permite criar nós de mensagem, menus numéricos e ações de escalonamento com drag-and-drop.',
      },
      {
        question: "Qual a diferença entre chatbot para WhatsApp e Widget?",
        answer:
          "O chatbot para WhatsApp é acionado quando um cliente envia mensagem pelo número integrado. O Widget de Página gera um link público que pode ser incorporado em sites. Ambos seguem a mesma árvore de decisão, mas operam em canais distintos.",
      },
      {
        question: "Posso ter múltiplos fluxos de chatbot?",
        answer:
          'Sim. Você pode criar quantos fluxos quiser. Um deles pode ser marcado como "Padrão" — ele será usado automaticamente para mensagens recebidas pelo WhatsApp quando nenhum fluxo específico é definido.',
      },
    ],
  },
  {
    title: "Conteúdo e Base de Conhecimento",
    icon: Book,
    items: [
      {
        question: "O que posso gerenciar na seção de Conteúdo?",
        answer:
          "A seção de Conteúdo centraliza artigos da base de conhecimento, mensagens rápidas para atendimento e materiais de referência. Esses conteúdos podem ser acessados tanto pelos atendentes quanto pelo chatbot.",
      },
      {
        question: "Como criar artigos na base de conhecimento?",
        answer:
          "Acesse Conteúdo, clique em Novo Artigo, preencha o título, conteúdo e categoria. Os artigos ficam disponíveis para consulta interna dos atendentes e podem ser referenciados durante os atendimentos.",
      },
    ],
  },
  {
    title: "Campanhas",
    icon: Megaphone,
    items: [
      {
        question: "O que são campanhas no Metadesk?",
        answer:
          "Campanhas permitem enviar comunicações ativas para listas de contatos via canais integrados. Elas podem ser usadas para notificações, promoções, pesquisas de satisfação e comunicados internos.",
      },
      {
        question: "Quais canais posso usar para campanhas?",
        answer:
          "Atualmente, campanhas podem ser enviadas pelo canal WhatsApp, utilizando a integração com a Evolution API configurada na seção de Integrações.",
      },
    ],
  },
  {
    title: "Monitoramento e IA",
    icon: BarChart3,
    items: [
      {
        question: "O que o monitoramento oferece?",
        answer:
          "O módulo de Monitoramento exibe indicadores em tempo real: total de solicitações, tempo médio de resolução, taxa de resolução e NPS. Gráficos interativos mostram tendências por período e métricas por tipo/categoria.",
      },
      {
        question: "Como funciona a análise com IA?",
        answer:
          'Abaixo de cada gráfico há um botão "Gerar análise IA". Ao clicar, o sistema utiliza o GPT-4o-mini para analisar os dados do gráfico e gerar insights, tendências e recomendações. Também é possível gerar um relatório executivo completo.',
      },
    ],
  },
  {
    title: "Administração",
    icon: Settings,
    items: [
      {
        question: "O que posso configurar na Administração?",
        answer:
          "A Administração possui três abas: 'Equipe' (gestão de usuários e perfis de acesso), 'Estrutura' (fluxos de trabalho/BPM com responsáveis e SLAs) e 'Chatbot' (criação e edição de fluxos de chatbot).",
      },
      {
        question: "Como adicionar novos atendentes?",
        answer:
          "Na aba 'Equipe' da Administração, adicione o e-mail do novo atendente e defina o perfil de acesso (Admin ou Atendente). O atendente receberá acesso após criar conta com o e-mail cadastrado.",
      },
    ],
  },
  {
    title: "Integrações",
    icon: Plug,
    items: [
      {
        question: "Quais integrações estão disponíveis?",
        answer:
          "O Metadesk integra com WhatsApp (Evolution API), e-mail (Resend), Agente de Voz (ElevenLabs) e IA (OpenAI). A seção de Integrações oferece documentação completa com exemplos de código.",
      },
      {
        question: "Como configurar webhooks?",
        answer:
          "Na seção de Integrações, acesse 'Webhooks'. Configure a URL de destino, os eventos que deseja monitorar e ative o webhook. Toda vez que o evento ocorrer, uma requisição será enviada para sua URL.",
      },
    ],
  },
  {
    title: "Segurança e Acesso",
    icon: Shield,
    items: [
      {
        question: "Os dados dos solicitantes estão protegidos?",
        answer:
          "Sim. Todos os dados são protegidos com Row Level Security (RLS) no banco de dados. Apenas usuários autenticados com o perfil adequado podem acessar informações sensíveis. Denúncias anônimas não armazenam dados identificáveis.",
      },
      {
        question: "Existe auditoria de alterações?",
        answer:
          "Sim. Todas as reclassificações e alterações em solicitações são registradas no log de auditoria (complaint_audit_log) com dados do campo alterado, valor anterior, novo valor e data/hora.",
      },
    ],
  },
];

// ============ TUTORIAL DATA ============

type TutorialStep = {
  title: string;
  description: string;
  tip?: string;
};

type Tutorial = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  duration: string;
  difficulty: "Iniciante" | "Intermediário" | "Avançado";
  steps: TutorialStep[];
};

const tutorials: Tutorial[] = [
  {
    id: "first-steps",
    title: "Primeiros Passos no Metadesk",
    description: "Aprenda a navegar pela plataforma e entender cada módulo.",
    icon: Home,
    duration: "5 min",
    difficulty: "Iniciante",
    steps: [
      {
        title: "Faça login na plataforma",
        description:
          "Acesse a URL do Metadesk e entre com seu e-mail e senha. Você será direcionado ao Dashboard (admin) ou Atendimento (atendente) conforme seu perfil.",
        tip: "Se esqueceu a senha, use a opção de recuperação na tela de login.",
      },
      {
        title: "Conheça o menu lateral",
        description:
          "O menu lateral (sidebar) dá acesso a todos os módulos: Dashboard, Atendimento, Solicitações, Conteúdo, Campanhas, Monitoramento, Administração e Integrações.",
        tip: 'Clique no ícone "X" no rodapé da sidebar para recolhê-la e ganhar mais espaço.',
      },
      {
        title: "Explore o Dashboard",
        description:
          "O Dashboard mostra os indicadores principais: conversas ativas, atendentes online, métricas de canal e desempenho da equipe. Use-o como ponto de partida para o dia.",
      },
      {
        title: "Configure seu perfil",
        description:
          'Clique no avatar no canto superior direito e acesse "Meu Perfil". Atualize seu nome, foto e informações de contato.',
      },
    ],
  },
  {
    id: "attend-conversation",
    title: "Atender uma Conversa",
    description: "Como receber, responder e encerrar um atendimento omnichannel.",
    icon: MessageSquare,
    duration: "4 min",
    difficulty: "Iniciante",
    steps: [
      {
        title: "Acesse o módulo de Atendimento",
        description:
          'No menu lateral, clique em "Atendimento". Você verá a lista de conversas ativas à esquerda e a área de conversa à direita.',
      },
      {
        title: "Selecione uma conversa",
        description:
          "Clique em uma conversa da fila para abri-la. O histórico completo será exibido, incluindo o canal de origem (WhatsApp ou Webchat) e o indicador de sentimento.",
      },
      {
        title: "Responda ao cliente",
        description:
          "Digite sua mensagem na caixa de texto na parte inferior. Use o ícone de raio (⚡) para acessar mensagens rápidas pré-configuradas.",
        tip: "Mensagens rápidas economizam tempo em respostas frequentes. Crie novas em Conteúdo.",
      },
      {
        title: "Transfira ou encerre",
        description:
          "Use a barra de ferramentas para transferir o atendimento a outro atendente ou encerrar a sessão quando o assunto for resolvido.",
      },
    ],
  },
  {
    id: "manage-complaints",
    title: "Gerenciar Solicitações",
    description: "Registrar, classificar e acompanhar solicitações.",
    icon: ClipboardList,
    duration: "6 min",
    difficulty: "Intermediário",
    steps: [
      {
        title: "Acesse o módulo de Solicitações",
        description:
          'No menu lateral, clique em "Solicitações". Você verá a lista de todas as solicitações registradas com filtros por status, tipo e categoria.',
      },
      {
        title: "Visualize os detalhes",
        description:
          "Clique em uma solicitação para abrir o modal de detalhes. Você verá informações do solicitante, descrição, anexos e o histórico completo de alterações.",
      },
      {
        title: "Reclassifique se necessário",
        description:
          'Na seção "Classificação e Gerenciamento", altere o tipo, categoria, status, responsável ou fluxo de trabalho. Todas as mudanças são registradas automaticamente.',
        tip: "Ao alterar o fluxo de trabalho, a solicitação será posicionada automaticamente na primeira etapa do novo fluxo.",
      },
      {
        title: "Adicione notas internas",
        description:
          "Use o campo de notas internas para registrar observações que só serão visíveis para a equipe interna. Útil para registrar decisões e contexto adicional.",
      },
      {
        title: "Consulte o histórico",
        description:
          'Clique em "Histórico de Alterações" para ver todas as mudanças realizadas na solicitação, incluindo quem alterou, o que mudou e quando.',
      },
    ],
  },
  {
    id: "create-chatbot",
    title: "Criar um Chatbot",
    description: "Configure um chatbot para WhatsApp ou Widget de Página.",
    icon: Bot,
    duration: "8 min",
    difficulty: "Intermediário",
    steps: [
      {
        title: "Acesse a aba Chatbot na Administração",
        description:
          'Vá em Administração → aba "Chatbot". Você verá todos os fluxos existentes.',
      },
      {
        title: "Crie um novo fluxo",
        description:
          'Clique em "Novo Fluxo". Escolha um nome descritivo, defina o canal (WhatsApp, Widget de Página ou Todos) e adicione uma descrição.',
        tip: "Use 'Widget de Página' para chatbots que serão incorporados em sites externos.",
      },
      {
        title: "Adicione o nó inicial (Mensagem de Boas-Vindas)",
        description:
          'No editor, clique em "Mensagem" para criar o primeiro nó. Este será a mensagem de boas-vindas que o usuário receberá ao iniciar a conversa.',
      },
      {
        title: "Crie um menu de opções",
        description:
          'Adicione um nó do tipo "Menu". Configure as opções numéricas que o usuário poderá escolher. Cada opção pode redirecionar para outro nó.',
      },
      {
        title: "Configure ações de escalonamento",
        description:
          'Adicione nós de "Ação" quando quiser encaminhar o usuário para um atendente humano ou encerrar a conversa. Configure o tipo de ação (escalonar, transferir ou encerrar).',
      },
      {
        title: "Ative e teste o fluxo",
        description:
          "Salve o fluxo e certifique-se de que está ativo. Para chatbots de widget, copie o link público e abra em uma nova aba para testar.",
        tip: "Use os botões de copiar/abrir link no card do fluxo para acessar rapidamente o link público.",
      },
    ],
  },
  {
    id: "setup-workflows",
    title: "Configurar Fluxos de Trabalho (BPM)",
    description: "Crie fluxos com etapas, responsáveis e SLAs.",
    icon: Workflow,
    duration: "7 min",
    difficulty: "Avançado",
    steps: [
      {
        title: "Acesse a aba Estrutura na Administração",
        description:
          'Vá em Administração → aba "Estrutura". Aqui você gerencia responsáveis e fluxos de trabalho.',
      },
      {
        title: "Cadastre responsáveis",
        description:
          'Na seção "Responsáveis", adicione as pessoas ou setores que serão responsáveis pelas etapas dos fluxos. Defina nome, e-mail, setor e cargo.',
      },
      {
        title: "Crie um novo fluxo de trabalho",
        description:
          'Na seção "Fluxos de Trabalho", clique em "Novo Fluxo". Defina o nome, tipo (reclamação, denúncia, etc.) e descrição.',
      },
      {
        title: "Adicione etapas sequenciais",
        description:
          "No editor, adicione etapas na ordem desejada. Para cada etapa, defina: nome, descrição, responsável e SLA (prazo em horas). Use drag-and-drop para reordenar.",
        tip: "Defina SLAs realistas. As etapas serão monitoradas automaticamente e alertas serão gerados quando o prazo estiver próximo.",
      },
      {
        title: "Salve e vincule às solicitações",
        description:
          "Salve o fluxo. Agora ele estará disponível para ser vinculado a novas solicitações no momento do registro ou reclassificação.",
      },
    ],
  },
  {
    id: "monitor-reports",
    title: "Monitorar e Gerar Relatórios com IA",
    description: "Acompanhe KPIs e gere análises inteligentes.",
    icon: BarChart3,
    duration: "5 min",
    difficulty: "Intermediário",
    steps: [
      {
        title: "Acesse o módulo de Monitoramento",
        description:
          'No menu lateral, clique em "Monitoramento". Você verá os cards de KPIs no topo e gráficos detalhados abaixo.',
      },
      {
        title: "Analise os indicadores",
        description:
          "Os KPIs mostram: total de solicitações, tempo médio de resolução, taxa de resolução e NPS. Cada card mostra a variação em relação ao período anterior.",
      },
      {
        title: "Explore os gráficos",
        description:
          "Role a página para ver gráficos de solicitações ao longo do tempo, distribuição por tipo e por status. Use os filtros de período para ajustar a visualização.",
      },
      {
        title: "Gere análises com IA",
        description:
          'Abaixo de cada gráfico, clique em "Gerar análise IA". O sistema processará os dados e gerará um relatório com tendências, insights e recomendações práticas.',
        tip: "O relatório executivo completo pode ser exportado para compartilhar com a gestão.",
      },
    ],
  },
  {
    id: "setup-integrations",
    title: "Configurar Integrações",
    description: "Conecte WhatsApp, e-mail e APIs externas.",
    icon: Plug,
    duration: "10 min",
    difficulty: "Avançado",
    steps: [
      {
        title: "Acesse o módulo de Integrações",
        description:
          'No menu lateral, clique em "Integrações". Você verá a documentação da API, chaves de acesso e configurações de conectores.',
      },
      {
        title: "Configure a integração WhatsApp",
        description:
          "Para WhatsApp, você precisa de uma instância na Evolution API. Configure a URL da API, chave de acesso e nome da instância nas configurações.",
        tip: "Após configurar, teste enviando uma mensagem para o número integrado e verifique se aparece na fila de atendimento.",
      },
      {
        title: "Configure chaves de API",
        description:
          "Na seção de chaves de API, gere ou configure suas chaves para integrar sistemas externos com o Metadesk. As chaves são usadas para autenticar requisições à API.",
      },
      {
        title: "Teste a integração",
        description:
          "Use os exemplos de código fornecidos (cURL, JavaScript, Python) para testar suas integrações. Verifique os logs de webhook para confirmar o recebimento de eventos.",
      },
    ],
  },
];

// ============ COMPONENTS ============

function FaqSection() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCategories = faqCategories
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.answer.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((category) => category.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar no FAQ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <HelpCircle className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">Nenhum resultado encontrado</p>
          <p className="text-sm">Tente pesquisar com outros termos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Card key={category.title} className="animate-fade-in">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-5 w-5 text-primary" />
                    {category.title}
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {category.items.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Accordion type="single" collapsible className="w-full">
                    {category.items.map((item, index) => (
                      <AccordionItem
                        key={index}
                        value={`item-${index}`}
                        className="border-b-0"
                      >
                        <AccordionTrigger className="text-sm text-left py-3 hover:no-underline hover:text-primary">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground pb-3">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TutorialCard({
  tutorial,
  onSelect,
}: {
  tutorial: Tutorial;
  onSelect: () => void;
}) {
  const Icon = tutorial.icon;
  const difficultyColor =
    tutorial.difficulty === "Iniciante"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : tutorial.difficulty === "Intermediário"
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 animate-fade-in group"
      onClick={onSelect}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">{tutorial.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {tutorial.description}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {tutorial.duration}
              </Badge>
              <Badge className={`text-xs ${difficultyColor} border-0`}>
                {tutorial.difficulty}
              </Badge>
              <span className="text-xs text-muted-foreground ml-auto">
                {tutorial.steps.length} passos
              </span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}

function TutorialOverlay({
  tutorial,
  onClose,
}: {
  tutorial: Tutorial;
  onClose: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = tutorial.steps[currentStep];
  const Icon = tutorial.icon;
  const isLastStep = currentStep === tutorial.steps.length - 1;
  const isFirstStep = currentStep === 0;
  const progress = ((currentStep + 1) / tutorial.steps.length) * 100;

  return (
    <div className="fixed inset-0 z-[9998]" onClick={(e) => e.stopPropagation()}>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Centered tutorial card */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <Card className="relative z-[9999] w-full max-w-lg shadow-2xl border-primary/30 bg-background/95 backdrop-blur-md animate-fade-in">
          <CardContent className="p-6 space-y-5">
            {/* Header with tutorial info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{tutorial.title}</h3>
                  <Badge variant="outline" className="text-xs mt-0.5">
                    Passo {currentStep + 1} de {tutorial.steps.length}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <span className="sr-only">Fechar</span>
                ✕
              </Button>
            </div>

            {/* Step content */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {currentStep + 1}
                </div>
                <div>
                  <h4 className="font-semibold text-base">{step.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>

              {step.tip && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 ml-11">
                  <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-primary">Dica:</strong> {step.tip}
                  </p>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="flex gap-1">
              {tutorial.steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                    i <= currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep((s) => s - 1)}
                disabled={isFirstStep}
                className="gap-1.5"
              >
                ← Anterior
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  if (isLastStep) {
                    onClose();
                  } else {
                    setCurrentStep((s) => s + 1);
                  }
                }}
                className="gap-1.5"
              >
                {isLastStep ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Concluir
                  </>
                ) : (
                  <>
                    Próximo →
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TutorialsSection() {
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(
    null
  );
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");

  const filteredTutorials =
    filterDifficulty === "all"
      ? tutorials
      : tutorials.filter((t) => t.difficulty === filterDifficulty);

  return (
    <div className="space-y-6">
      {/* Overlay tutorial */}
      {selectedTutorial && (
        <TutorialOverlay
          tutorial={selectedTutorial}
          onClose={() => setSelectedTutorial(null)}
        />
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">
          Filtrar por nível:
        </span>
        {["all", "Iniciante", "Intermediário", "Avançado"].map((level) => (
          <Button
            key={level}
            variant={filterDifficulty === level ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterDifficulty(level)}
          >
            {level === "all" ? "Todos" : level}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTutorials.map((tutorial) => (
          <TutorialCard
            key={tutorial.id}
            tutorial={tutorial}
            onSelect={() => setSelectedTutorial(tutorial)}
          />
        ))}
      </div>

      {filteredTutorials.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <BookOpen className="h-12 w-12 mb-4" />
          <p>Nenhum tutorial encontrado para este nível.</p>
        </div>
      )}
    </div>
  );
}

// ============ MAIN PAGE ============

export default function Informacoes() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Central de Informações</h1>
          <p className="text-muted-foreground">
            Tire dúvidas sobre a plataforma e aprenda com tutoriais interativos.
          </p>
        </div>

        <Tabs defaultValue="faq">
          <TabsList>
            <TabsTrigger value="faq" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="tutorials" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Tutoriais
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faq" className="mt-6">
            <FaqSection />
          </TabsContent>

          <TabsContent value="tutorials" className="mt-6">
            <TutorialsSection />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
