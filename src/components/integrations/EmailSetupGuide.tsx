import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Mail,
  CheckCircle2,
  ExternalLink,
  Shield,
  Key,
  ArrowRight,
  Globe,
  Server,
  Copy,
  Check,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmailAccountSettings } from "@/components/email/EmailAccountSettings";

export function EmailSetupGuide() {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast({ title: "Copiado!" });
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Integração com Gmail e Outlook
          </CardTitle>
          <CardDescription>
            Conecte seu email corporativo para enviar notificações de fluxo de trabalho e receber respostas diretamente na plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">O que você poderá fazer:</p>
              <ul className="list-disc ml-4 space-y-1 text-xs">
                <li>Enviar notificações automáticas aos responsáveis de cada etapa do fluxo de trabalho</li>
                <li>Receber respostas por email e visualizá-las no histórico da solicitação</li>
                <li>Personalizar o remetente com o email da sua organização</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step-by-step guides */}
      <Accordion type="single" collapsible className="space-y-3">
        {/* Gmail Guide */}
        <AccordionItem value="gmail" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Globe className="h-5 w-5 text-red-500" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Gmail (Google)</p>
                <p className="text-xs text-muted-foreground">Configuração via App Password — leva cerca de 5 minutos</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <div className="space-y-6 ml-[52px]">
              {/* Step 1 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full w-6 h-6 p-0 flex items-center justify-center text-xs font-bold">1</Badge>
                  <h4 className="font-medium text-sm">Ative a verificação em duas etapas</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Acesse <strong>Gerenciar sua Conta Google → Segurança → Verificação em duas etapas</strong> e ative-a. Isso é obrigatório para gerar a senha de app.
                </p>
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir Segurança do Google
                  </a>
                </Button>
              </div>

              <Separator />

              {/* Step 2 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full w-6 h-6 p-0 flex items-center justify-center text-xs font-bold">2</Badge>
                  <h4 className="font-medium text-sm">Gere uma Senha de App (App Password)</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Acesse o link abaixo, dê um nome (ex: "Metadesk") e copie a senha de 16 caracteres gerada.
                </p>
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer">
                    <Key className="h-3.5 w-3.5" />
                    Gerar App Password
                  </a>
                </Button>
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Copie a senha imediatamente! O Google não mostra novamente. Se perder, delete e gere uma nova.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Step 3 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full w-6 h-6 p-0 flex items-center justify-center text-xs font-bold">3</Badge>
                  <h4 className="font-medium text-sm">Conecte na plataforma</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  No formulário abaixo, escolha <strong>SMTP Manual</strong> e preencha:
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border bg-muted/30 space-y-1.5">
                    <p className="font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Envio (SMTP)</p>
                    <div className="flex items-center justify-between">
                      <span>Servidor:</span>
                      <div className="flex items-center gap-1">
                        <code className="text-primary">smtp.gmail.com</code>
                        <button onClick={() => copyText("smtp.gmail.com", "gmail-smtp")} className="text-muted-foreground hover:text-foreground">
                          {copied === "gmail-smtp" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Porta:</span>
                      <code className="text-primary">587</code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Usuário:</span>
                      <span className="text-muted-foreground italic">seu@gmail.com</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Senha:</span>
                      <span className="text-muted-foreground italic">App Password do passo 2</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30 space-y-1.5">
                    <p className="font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Recebimento (IMAP)</p>
                    <div className="flex items-center justify-between">
                      <span>Servidor:</span>
                      <div className="flex items-center gap-1">
                        <code className="text-primary">imap.gmail.com</code>
                        <button onClick={() => copyText("imap.gmail.com", "gmail-imap")} className="text-muted-foreground hover:text-foreground">
                          {copied === "gmail-imap" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Porta:</span>
                      <code className="text-primary">993</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Outlook Guide */}
        <AccordionItem value="outlook" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Globe className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Outlook / Microsoft 365</p>
                <p className="text-xs text-muted-foreground">Configuração via SMTP autenticado — leva cerca de 3 minutos</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <div className="space-y-6 ml-[52px]">
              {/* Step 1 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full w-6 h-6 p-0 flex items-center justify-center text-xs font-bold">1</Badge>
                  <h4 className="font-medium text-sm">Verifique se o SMTP está habilitado</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  No <strong>Microsoft 365 Admin Center</strong>, vá em <strong>Configurações → Email → SMTP autenticado</strong> e verifique se está habilitado para seu usuário.
                </p>
                <p className="text-xs text-muted-foreground">
                  Para contas pessoais (outlook.com / hotmail.com), o SMTP já vem habilitado por padrão.
                </p>
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href="https://admin.microsoft.com/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Admin Center Microsoft
                  </a>
                </Button>
              </div>

              <Separator />

              {/* Step 2 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full w-6 h-6 p-0 flex items-center justify-center text-xs font-bold">2</Badge>
                  <h4 className="font-medium text-sm">Se tiver MFA ativado, gere uma App Password</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Acesse <strong>Conta Microsoft → Segurança → Opções avançadas → Senhas de app</strong> e gere uma nova senha.
                </p>
                <p className="text-xs text-muted-foreground">
                  Se não tiver MFA ativado, use sua senha normal do Outlook.
                </p>
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href="https://account.microsoft.com/security" target="_blank" rel="noopener noreferrer">
                    <Shield className="h-3.5 w-3.5" />
                    Segurança Microsoft
                  </a>
                </Button>
              </div>

              <Separator />

              {/* Step 3 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full w-6 h-6 p-0 flex items-center justify-center text-xs font-bold">3</Badge>
                  <h4 className="font-medium text-sm">Conecte na plataforma</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  No formulário abaixo, escolha <strong>SMTP Manual</strong> e preencha:
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border bg-muted/30 space-y-1.5">
                    <p className="font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Envio (SMTP)</p>
                    <div className="flex items-center justify-between">
                      <span>Servidor:</span>
                      <div className="flex items-center gap-1">
                        <code className="text-primary">smtp.office365.com</code>
                        <button onClick={() => copyText("smtp.office365.com", "outlook-smtp")} className="text-muted-foreground hover:text-foreground">
                          {copied === "outlook-smtp" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Porta:</span>
                      <code className="text-primary">587</code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Usuário:</span>
                      <span className="text-muted-foreground italic">seu@outlook.com</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Senha:</span>
                      <span className="text-muted-foreground italic">Senha ou App Password</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30 space-y-1.5">
                    <p className="font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Recebimento (IMAP)</p>
                    <div className="flex items-center justify-between">
                      <span>Servidor:</span>
                      <div className="flex items-center gap-1">
                        <code className="text-primary">outlook.office365.com</code>
                        <button onClick={() => copyText("outlook.office365.com", "outlook-imap")} className="text-muted-foreground hover:text-foreground">
                          {copied === "outlook-imap" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Porta:</span>
                      <code className="text-primary">993</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Email Account Connection Form */}
      <EmailAccountSettings />
    </div>
  );
}
