import { useEffect, useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, FileText, User, Calendar, MapPin, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { IdentificationData } from "./StepIdentification";
import { DetailsData } from "./StepDetails";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StepConfirmationProps {
  identificationData: IdentificationData;
  detailsData: DetailsData;
  files: File[];
  captchaToken: string | null;
  onCaptchaChange: (token: string | null) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

const RECAPTCHA_SITE_KEY = "6LdkO1osAAAAAL7sEXFROu8ubfOb9aI4971WgJ43";

// Declare global grecaptcha v2 type
declare global {
  interface Window {
    grecaptcha: {
      render: (container: HTMLElement | string, parameters: {
        sitekey: string;
        callback: (token: string) => void;
        "expired-callback"?: () => void;
        "error-callback"?: () => void;
        theme?: "light" | "dark";
        size?: "compact" | "normal";
      }) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
    onRecaptchaLoad?: () => void;
  }
}

export function StepConfirmation({
  identificationData,
  detailsData,
  files,
  captchaToken,
  onCaptchaChange,
  onSubmit,
  onBack,
  isSubmitting,
}: StepConfirmationProps) {
  const [isRecaptchaReady, setIsRecaptchaReady] = useState(false);
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  

  useEffect(() => {
    let isMounted = true;

    const renderWidget = () => {
      if (!isMounted) return;
      if (!recaptchaContainerRef.current) return;
      if (widgetIdRef.current !== null) return;
      
      try {
        widgetIdRef.current = window.grecaptcha.render(recaptchaContainerRef.current, {
          sitekey: RECAPTCHA_SITE_KEY,
          callback: (token: string) => {
            if (isMounted) {
              console.log("reCAPTCHA verified successfully");
              setRecaptchaError(null);
              onCaptchaChange(token);
            }
          },
          "expired-callback": () => {
            if (isMounted) {
              console.log("reCAPTCHA expired");
              onCaptchaChange(null);
              setRecaptchaError("Verificação expirou. Por favor, marque o checkbox novamente.");
            }
          },
          "error-callback": () => {
            if (isMounted) {
              console.error("reCAPTCHA error");
              onCaptchaChange(null);
              setRecaptchaError("Erro na verificação. Por favor, tente novamente.");
            }
          },
          theme: "light",
          size: "normal"
        });
        if (isMounted) {
          setIsRecaptchaReady(true);
        }
      } catch (error) {
        console.error("Error rendering reCAPTCHA:", error);
        if (isMounted) {
          setRecaptchaError("Erro ao inicializar reCAPTCHA. Por favor, recarregue a página.");
        }
      }
    };

    // Define callback FIRST (before any checks)
    window.onRecaptchaLoad = () => {
      renderWidget();
    };

    // Check if grecaptcha is already loaded and ready
    if (window.grecaptcha && window.grecaptcha.render) {
      renderWidget();
      return () => {
        isMounted = false;
      };
    }

    // Check if script already exists but grecaptcha not ready yet
    const existingScript = document.querySelector('script[src*="recaptcha/api.js"]');
    if (existingScript) {
      // Script exists, just wait for onRecaptchaLoad callback
      return () => {
        isMounted = false;
      };
    }

    // Load script for first time
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit`;
    script.async = true;
    script.defer = true;
    
    script.onerror = () => {
      console.error("Failed to load reCAPTCHA script");
      if (isMounted) {
        setRecaptchaError("Erro ao carregar reCAPTCHA. Por favor, recarregue a página.");
      }
    };
    
    document.head.appendChild(script);

    return () => {
      isMounted = false;
    };
  }, [onCaptchaChange]);

  const handleSubmit = useCallback(() => {
    if (!captchaToken) {
      setRecaptchaError("Por favor, marque o checkbox 'Não sou um robô' antes de enviar.");
      return;
    }
    
    setRecaptchaError(null);
    onSubmit();
  }, [captchaToken, onSubmit]);

  const typeLabels = {
    reclamacao: "Reclamação",
    denuncia: "Denúncia",
    sugestao: "Sugestão",
  };

  const categoryLabels: Record<string, string> = {
    atendimento: "Atendimento",
    produto: "Produto",
    servico: "Serviço",
    conduta: "Conduta",
    financeiro: "Financeiro",
    outro: "Outro",
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Não informada";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Confirme sua Solicitação
        </h2>
        <p className="text-muted-foreground">
          Revise os dados antes de enviar
        </p>
      </div>

      {/* Summary card */}
      <div className="bg-muted/50 rounded-lg p-6 space-y-4">
        {/* Identification */}
        <div className="flex items-start gap-3">
          <User className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Identificação</p>
            <p className="text-foreground">
              {identificationData.isAnonymous
                ? "Anônimo"
                : `${identificationData.name} (${identificationData.email})`}
            </p>
          </div>
        </div>

        {/* Type and Category */}
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Tipo / Categoria</p>
            <p className="text-foreground">
              {detailsData.type ? typeLabels[detailsData.type] : ""} • {categoryLabels[detailsData.category] || detailsData.category}
            </p>
          </div>
        </div>

        {/* Date */}
        {detailsData.occurredAt && (
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Data do ocorrido</p>
              <p className="text-foreground">{formatDate(detailsData.occurredAt)}</p>
            </div>
          </div>
        )}

        {/* Location */}
        {detailsData.location && (
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Local</p>
              <p className="text-foreground">{detailsData.location}</p>
            </div>
          </div>
        )}

        {/* Description preview */}
        <div className="pt-2 border-t border-border">
          <p className="text-sm font-medium text-muted-foreground mb-1">Descrição</p>
          <p className="text-foreground text-sm line-clamp-3">{detailsData.description}</p>
        </div>

        {/* Attachments */}
        {files.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Anexos ({files.length})
            </p>
            <p className="text-foreground text-sm">
              {files.map((f) => f.name).join(", ")}
            </p>
          </div>
        )}
      </div>

      {/* reCAPTCHA error message */}
      {recaptchaError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{recaptchaError}</AlertDescription>
        </Alert>
      )}

      {/* reCAPTCHA v2 Checkbox Widget */}
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="w-4 h-4" />
          <span>Verificação de segurança</span>
        </div>
        
        {/* reCAPTCHA container */}
        <div 
          ref={recaptchaContainerRef} 
          className="flex justify-center"
        />
        
        {captchaToken && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            ✓ Verificação concluída
          </p>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} className="gap-2" disabled={isSubmitting}>
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!captchaToken || isSubmitting}
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" /> Enviar Solicitação
            </>
          )}
        </Button>
      </div>

      {/* reCAPTCHA branding notice */}
      <p className="text-xs text-center text-muted-foreground">
        Este site é protegido pelo reCAPTCHA e as{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">
          Políticas de Privacidade
        </a>{" "}
        e{" "}
        <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">
          Termos de Serviço
        </a>{" "}
        do Google se aplicam.
      </p>
    </div>
  );
}
