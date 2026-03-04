import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Mail, 
  Plus, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Globe,
  Server,
  Star,
} from "lucide-react";
import { 
  useEmailAccounts, 
  useCreateEmailAccount, 
  useDeleteEmailAccount, 
  type EmailAccount 
} from "@/hooks/useEmailAccounts";

export function EmailAccountSettings() {
  const { data: accounts, isLoading } = useEmailAccounts();
  const createAccount = useCreateEmailAccount();
  const deleteAccount = useDeleteEmailAccount();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [accountType, setAccountType] = useState<string>("smtp");
  const [formData, setFormData] = useState({
    email_address: "",
    display_name: "",
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_password: "",
    imap_host: "",
    imap_port: "993",
  });

  const handleAdd = async () => {
    if (!formData.email_address) return;

    await createAccount.mutateAsync({
      account_type: accountType,
      email_address: formData.email_address,
      display_name: formData.display_name || undefined,
      smtp_host: accountType === "smtp" ? formData.smtp_host : undefined,
      smtp_port: accountType === "smtp" ? parseInt(formData.smtp_port) : undefined,
      smtp_user: accountType === "smtp" ? formData.smtp_user : undefined,
      smtp_password: accountType === "smtp" ? formData.smtp_password : undefined,
      imap_host: accountType === "smtp" ? formData.imap_host || undefined : undefined,
      imap_port: accountType === "smtp" && formData.imap_host ? parseInt(formData.imap_port) : undefined,
      is_default: !accounts || accounts.length === 0,
    });

    setShowAddDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setAccountType("smtp");
    setFormData({
      email_address: "",
      display_name: "",
      smtp_host: "",
      smtp_port: "587",
      smtp_user: "",
      smtp_password: "",
      imap_host: "",
      imap_port: "993",
    });
  };

  const handleOAuthConnect = (provider: "gmail_oauth" | "outlook_oauth") => {
    // OAuth flow - would redirect to Google/Microsoft consent screen
    // For now, show info about what's needed
    setAccountType(provider);
    setShowAddDialog(true);
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case "gmail_oauth": return <Globe className="h-4 w-4 text-red-500" />;
      case "outlook_oauth": return <Globe className="h-4 w-4 text-blue-500" />;
      default: return <Server className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case "gmail_oauth": return "Gmail";
      case "outlook_oauth": return "Outlook";
      default: return "SMTP";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contas de Email
            </CardTitle>
            <CardDescription>
              Conecte sua conta Gmail ou Outlook para enviar e receber emails pela plataforma
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Conectar Email
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !accounts || accounts.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Nenhuma conta de email conectada
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleOAuthConnect("gmail_oauth")} className="gap-2">
                <Globe className="h-4 w-4 text-red-500" />
                Gmail
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleOAuthConnect("outlook_oauth")} className="gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                Outlook
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setAccountType("smtp"); setShowAddDialog(true); }} className="gap-2">
                <Server className="h-4 w-4" />
                SMTP
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  {getAccountTypeIcon(account.account_type)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{account.email_address}</span>
                      {account.is_default && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Star className="h-3 w-3" />
                          Padrão
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{getAccountTypeLabel(account.account_type)}</span>
                      {account.display_name && <span>· {account.display_name}</span>}
                      {account.is_active ? (
                        <Badge variant="outline" className="text-[10px] text-green-600 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-0.5" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-red-600 border-red-200">
                          <AlertCircle className="h-3 w-3 mr-0.5" />
                          Inativo
                        </Badge>
                      )}
                    </div>
                    {account.last_poll_error && (
                      <p className="text-[10px] text-destructive mt-1">{account.last_poll_error}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteAccount.mutate(account.id)}
                  disabled={deleteAccount.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Email Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Conectar Conta de Email</DialogTitle>
            <DialogDescription>
              Escolha o tipo de conta e configure as credenciais.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Conta</Label>
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smtp">SMTP Manual</SelectItem>
                  <SelectItem value="gmail_oauth">Gmail (Google)</SelectItem>
                  <SelectItem value="outlook_oauth">Outlook (Microsoft)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(accountType === "gmail_oauth" || accountType === "outlook_oauth") && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {accountType === "gmail_oauth" ? (
                    <>
                      Para conectar o Gmail, o administrador precisa configurar as credenciais OAuth do Google 
                      (Client ID e Client Secret) nos secrets do projeto. Após configurado, insira seu email 
                      e as permissões serão solicitadas automaticamente.
                    </>
                  ) : (
                    <>
                      Para conectar o Outlook, o administrador precisa configurar as credenciais OAuth da Microsoft 
                      (Client ID e Client Secret) nos secrets do projeto. Após configurado, insira seu email 
                      e as permissões serão solicitadas automaticamente.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email_address">Endereço de Email *</Label>
              <Input
                id="email_address"
                type="email"
                placeholder="seu@email.com"
                value={formData.email_address}
                onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Nome de Exibição</Label>
              <Input
                id="display_name"
                placeholder="Seu Nome"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              />
            </div>

            {accountType === "smtp" && (
              <>
                <Separator />
                <p className="text-sm font-medium">Configurações SMTP (Envio)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="smtp_host">Servidor SMTP</Label>
                    <Input
                      id="smtp_host"
                      placeholder="smtp.gmail.com"
                      value={formData.smtp_host}
                      onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp_port">Porta</Label>
                    <Input
                      id="smtp_port"
                      placeholder="587"
                      value={formData.smtp_port}
                      onChange={(e) => setFormData({ ...formData, smtp_port: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_user">Usuário SMTP</Label>
                  <Input
                    id="smtp_user"
                    placeholder="seu@email.com"
                    value={formData.smtp_user}
                    onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_password">Senha / App Password</Label>
                  <Input
                    id="smtp_password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.smtp_password}
                    onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
                  />
                </div>

                <Separator />
                <p className="text-sm font-medium">Configurações IMAP (Recebimento - opcional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="imap_host">Servidor IMAP</Label>
                    <Input
                      id="imap_host"
                      placeholder="imap.gmail.com"
                      value={formData.imap_host}
                      onChange={(e) => setFormData({ ...formData, imap_host: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imap_port">Porta</Label>
                    <Input
                      id="imap_port"
                      placeholder="993"
                      value={formData.imap_port}
                      onChange={(e) => setFormData({ ...formData, imap_port: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              disabled={createAccount.isPending || !formData.email_address}
              className="gap-2"
            >
              {createAccount.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Conectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
