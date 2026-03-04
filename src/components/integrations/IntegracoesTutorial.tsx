import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Zap,
  Database,
  Plug,
  Code2,
  ArrowRight,
  ArrowLeft,
  X,
  Lightbulb,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TutorialStep {
  targetSelector: string;
  tabValue?: string;
  title: string;
  description: string;
  tip?: string;
  position: "top" | "bottom" | "center";
}

const tutorialSteps: TutorialStep[] = [
  {
    targetSelector: '[data-tutorial="tab-overview"]',
    tabValue: "overview",
    title: "1/7 — Visão Geral",
    description:
      "Comece por aqui! Esta aba mostra a arquitetura completa da plataforma: URLs base da API, endpoints REST e Realtime, e como funciona a autenticação com Anon Key.",
    tip: "Copie as URLs base diretamente dos campos para usar no seu código.",
    position: "bottom",
  },
  {
    targetSelector: '[data-tutorial="auth-section"]',
    tabValue: "overview",
    title: "2/7 — Autenticação",
    description:
      "Todas as requisições à API precisam de um header Authorization com a Anon Key (pública) ou o JWT do usuário logado. Nunca use a Service Role Key no frontend.",
    tip: 'Clique no ícone de "olho" para revelar a chave completa e copiar.',
    position: "bottom",
  },
  {
    targetSelector: '[data-tutorial="tab-functions"]',
    tabValue: "functions",
    title: "3/7 — Edge Functions",
    description:
      "Aqui estão listadas todas as 9 Edge Functions do sistema. Cada uma documenta: método HTTP, parâmetros obrigatórios/opcionais, tipo de autenticação e exemplo de resposta JSON.",
    tip: "Use os filtros por categoria (IA, Chatbot, WhatsApp, Voz, E-mail) para encontrar rapidamente a função desejada.",
    position: "bottom",
  },
  {
    targetSelector: '[data-tutorial="tab-database"]',
    tabValue: "database",
    title: "4/7 — Banco de Dados",
    description:
      "Consulte a estrutura das tabelas PostgreSQL. Cada tabela tem seu endpoint REST copiável. Também documenta quais tabelas têm Realtime habilitado para escuta via WebSocket.",
    tip: "Use o Supabase SDK (supabase.from('tabela').select()) para queries tipadas.",
    position: "bottom",
  },
  {
    targetSelector: '[data-tutorial="tab-integrations"]',
    tabValue: "integrations",
    title: "5/7 — Integrações Externas",
    description:
      "Veja todas as integrações configuradas: WhatsApp (Evolution API), ElevenLabs (Voz), Resend (E-mail), IA Gateway, reCAPTCHA e Supabase Auth. Cada card mostra as secrets necessárias.",
    tip: "Os webhooks ativos (WhatsApp e Voice Agent) estão documentados com URLs copiáveis para configurar nos provedores externos.",
    position: "bottom",
  },
  {
    targetSelector: '[data-tutorial="tab-examples"]',
    tabValue: "examples",
    title: "6/7 — Exemplos de Código",
    description:
      "Exemplos prontos para copiar em cURL, JavaScript (SDK) e Python. Inclui triagem IA, Realtime, queries REST e códigos de resposta HTTP.",
    tip: "Comece pelo exemplo de Triagem IA — é a integração mais poderosa da plataforma.",
    position: "bottom",
  },
  {
    targetSelector: '[data-tutorial="supabase-badge"]',
    title: "7/7 — Projeto Supabase",
    description:
      'Pronto! Agora você conhece toda a API. O ID do projeto Supabase está sempre visível aqui. Acesse o dashboard Supabase para gerenciar Edge Functions, SQL Editor e Storage.',
    tip: "Para dúvidas, consulte a documentação do Supabase em supabase.com/docs.",
    position: "bottom",
  },
];

interface IntegracoesTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onChangeTab: (tab: string) => void;
}

export function IntegracoesTutorial({
  isOpen,
  onClose,
  onChangeTab,
}: IntegracoesTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const step = tutorialSteps[currentStep];

  const updateHighlight = useCallback(() => {
    if (!isOpen) return;
    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setHighlightRect(rect);
    } else {
      setHighlightRect(null);
    }
  }, [isOpen, step.targetSelector]);

  // Navigate tab when step changes
  useEffect(() => {
    if (!isOpen) return;
    if (step.tabValue) {
      onChangeTab(step.tabValue);
    }
    // Delay to let tab content render
    const timer = setTimeout(updateHighlight, 150);
    return () => clearTimeout(timer);
  }, [isOpen, currentStep, step.tabValue, onChangeTab, updateHighlight]);

  // Update highlight on scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("resize", updateHighlight);
    window.addEventListener("scroll", updateHighlight, true);
    return () => {
      window.removeEventListener("resize", updateHighlight);
      window.removeEventListener("scroll", updateHighlight, true);
    };
  }, [isOpen, updateHighlight]);

  if (!isOpen) return null;

  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  // Compute spotlight clip-path
  const padding = 8;
  const borderRadius = 10;
  const spotlight = highlightRect
    ? {
        x: highlightRect.x - padding,
        y: highlightRect.y - padding,
        w: highlightRect.width + padding * 2,
        h: highlightRect.height + padding * 2,
      }
    : null;

  return (
    <>
      {/* Overlay with spotlight cutout */}
      <div
        className="fixed inset-0 z-[9998] transition-all duration-300"
        onClick={handleClose}
        style={{
          background: "rgba(0,0,0,0.6)",
          ...(spotlight
            ? {
                clipPath: `polygon(
                  0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
                  ${spotlight.x}px ${spotlight.y}px,
                  ${spotlight.x}px ${spotlight.y + spotlight.h}px,
                  ${spotlight.x + spotlight.w}px ${spotlight.y + spotlight.h}px,
                  ${spotlight.x + spotlight.w}px ${spotlight.y}px,
                  ${spotlight.x}px ${spotlight.y}px
                )`,
              }
            : {}),
        }}
      />

      {/* Spotlight border ring */}
      {spotlight && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-xl border-2 border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.25)] transition-all duration-300"
          style={{
            left: spotlight.x,
            top: spotlight.y,
            width: spotlight.w,
            height: spotlight.h,
          }}
        />
      )}

      {/* Central explanation card */}
      <div
        className="fixed z-[10000] left-1/2 -translate-x-1/2 w-full max-w-lg px-4 transition-all duration-300"
        style={{
          top: spotlight
            ? Math.min(
                spotlight.y + spotlight.h + 24,
                window.innerHeight - 280
              )
            : "50%",
          ...(spotlight ? {} : { transform: "translate(-50%, -50%)" }),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="shadow-2xl border-primary/30 bg-background/95 backdrop-blur-md">
          <CardContent className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <GraduationCap className="h-4 w-4 text-primary" />
                </div>
                <Badge variant="outline" className="text-xs font-semibold">
                  {step.title}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Description */}
            <p className="text-sm leading-relaxed">{step.description}</p>

            {/* Tip */}
            {step.tip && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">{step.tip}</p>
              </div>
            )}

            {/* Progress bar */}
            <div className="flex gap-1">
              {tutorialSteps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    i <= currentStep ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                disabled={isFirstStep}
                className="gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Anterior
              </Button>

              <Button
                size="sm"
                onClick={handleNext}
                className="gap-1.5"
              >
                {isLastStep ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Concluir
                  </>
                ) : (
                  <>
                    Próximo
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
