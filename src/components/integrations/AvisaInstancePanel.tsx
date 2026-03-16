import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  QrCode,
  RefreshCw,
  Unplug,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SETTINGS_KEY = "avisa_api_token";
const AVISA_WEBHOOK_BASE = "https://www.avisaapi.com.br/api";
const QR_POLL_INTERVAL_SEC = 15;

/** Busca o token AvisaAPI em integration_settings (frontend faz a requisição direta à AvisaAPI). */
async function getAvisaToken(): Promise<string | null> {
  const { data } = await supabase
    .from("integration_settings" as any)
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  return data?.value && typeof data.value === "string" ? data.value : null;
}

/** POST para AvisaAPI /webhook (registrar ou remover). Chamada direta do front. */
async function postWebhookAvisa(token: string, webhookValue: string): Promise<{ ok: boolean; data?: unknown }> {
  const res = await fetch(`${AVISA_WEBHOOK_BASE}/webhook`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ webhook: webhookValue }),
  });
  let data: unknown = null;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { ok: res.ok, data };
}

type StatusPayload = {
  ok?: boolean;
  status?: number;
  data?: unknown;
  imageBase64?: string;
  error?: string;
};

function parseAvisaStatusPayload(payload: StatusPayload | null): {
  connected: boolean;
  loggedIn: boolean;
  jid: string | null;
} {
  const empty = { connected: false, loggedIn: false, jid: null };
  let root: unknown = payload?.data;
  if (root == null || typeof root !== "object") return empty;

  for (let i = 0; i < 5 && root && typeof root === "object"; i++) {
    const o = root as Record<string, unknown>;
    if (o.Connected !== undefined || o.LoggedIn !== undefined) {
      const jid =
        typeof o.Jid === "string"
          ? o.Jid
          : o.Jid === null || o.Jid === undefined
            ? null
            : String(o.Jid);
      return {
        connected: o.Connected === true,
        loggedIn: o.LoggedIn === true,
        jid,
      };
    }
    const next = o.data;
    if (next && typeof next === "object") root = next;
    else break;
  }
  return empty;
}

/** Ex.: 554784323514:52@s.whatsapp.net → +55 47 8432-3514 */
function formatWhatsAppFromJid(jid: string | null): string | null {
  if (!jid) return null;
  const beforeAt = jid.split("@")[0] || "";
  const digits = beforeAt.split(":")[0]?.replace(/\D/g, "") || "";
  if (digits.length < 10) return jid;
  if (digits.length === 13 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    if (rest.length === 9) {
      return `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    }
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return `+${digits}`;
}

function isFullyConnected(payload: StatusPayload | null): boolean {
  if (!payload?.ok || payload.error) return false;
  const p = parseAvisaStatusPayload(payload);
  return p.connected === true && p.loggedIn === true;
}

type AvisaInstancePanelProps = {
  integrationsTabActive?: boolean;
};

export function AvisaInstancePanel({ integrationsTabActive = true }: AvisaInstancePanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusPayload, setStatusPayload] = useState<StatusPayload | null>(null);
  const [qrPayload, setQrPayload] = useState<StatusPayload | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenSaving, setTokenSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [qrCountdown, setQrCountdown] = useState<number | null>(null);
  const wasConnectedRef = useRef(false);

  const callInstance = useCallback(async (action: "qr" | "status" | "disconnect") => {
    const { data, error } = await supabase.functions.invoke("avisa-instance", {
      body: { action },
    });
    if (error) {
      return { error: error.message || String(error) } as StatusPayload;
    }
    return (data || {}) as StatusPayload;
  }, []);

  const baseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
  const webhookUrl = baseUrl ? `${baseUrl}/functions/v1/avisa-webhook` : "";

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await callInstance("status");
      setStatusPayload(res);
    } finally {
      setStatusLoading(false);
    }
  }, [callInstance]);

  const loadQr = useCallback(async () => {
    const preStatus = await callInstance("status");
    setStatusPayload(preStatus);
    if (parseAvisaStatusPayload(preStatus).connected === true) {
      toast({
        title: "Instância já em uso",
        description: "Desconecte antes para gerar um novo QR Code.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setQrPayload(null);
    try {
      const res = await callInstance("qr");
      setQrPayload(res);
      if (res.error) {
        toast({ title: "Erro ao obter QR", description: res.error, variant: "destructive" });
      } else if (!res.ok && res.status && res.status >= 400) {
        toast({
          title: "Não foi possível gerar QR",
          description: "Instância pode já estar conectada. Desconecte e tente novamente.",
          variant: "destructive",
        });
        await loadStatus();
      }
    } finally {
      setLoading(false);
    }
  }, [callInstance, toast, loadStatus]);

  const disconnect = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callInstance("disconnect");
      if (res.error) {
        toast({ title: "Erro ao desconectar", description: res.error, variant: "destructive" });
      } else {
        // Front envia direto para AvisaAPI: POST /webhook com webhook vazio
        const token = await getAvisaToken();
        if (token) {
          try {
            await postWebhookAvisa(token, "");
          } catch {
            await supabase.functions.invoke("avisa-instance", { body: { action: "remove_webhook" } });
          }
        } else {
          await supabase.functions.invoke("avisa-instance", { body: { action: "remove_webhook" } });
        }
        toast({ title: "Desconectado", description: "Instância desligada e webhook removido na AvisaAPI." });
        setQrPayload(null);
        await loadStatus();
      }
    } finally {
      setLoading(false);
    }
  }, [callInstance, toast, loadStatus]);

  useEffect(() => {
    if (integrationsTabActive) {
      loadStatus();
    }
  }, [integrationsTabActive, loadStatus]);

  // Carregar token salvo para exibir mascarado no input (RLS: só admin lê)
  useEffect(() => {
    if (!integrationsTabActive) return;
    (async () => {
      const { data } = await supabase
        .from("integration_settings" as any)
        .select("value")
        .eq("key", SETTINGS_KEY)
        .maybeSingle();
      if (data?.value && typeof data.value === "string") {
        setTokenInput(data.value);
      }
    })();
  }, [integrationsTabActive]);

  const extractQrcodeSrc = (payload: StatusPayload | null): string | null => {
    if (!payload) return null;
    if (payload.imageBase64 != null) {
      return `data:${(payload as any).contentType || "image/png"};base64,${payload.imageBase64}`;
    }
    const root = payload.data;
    if (!root || typeof root !== "object") return null;
    const r = root as Record<string, unknown>;
    let raw: string | null =
      typeof r.qrcode === "string"
        ? r.qrcode
        : typeof r.base64 === "string"
          ? r.base64
          : null;
    if (!raw && r.data && typeof r.data === "object") {
      const inner = r.data as Record<string, unknown>;
      raw =
        typeof inner.qrcode === "string"
          ? inner.qrcode
          : typeof inner.base64 === "string"
            ? inner.base64
            : null;
    }
    if (!raw || typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (trimmed.startsWith("data:image")) return trimmed;
    return `data:image/png;base64,${trimmed}`;
  };

  const qrSrc = extractQrcodeSrc(qrPayload);

  useEffect(() => {
    if (!qrSrc) {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setQrCountdown(null);
      return;
    }
    setQrCountdown(QR_POLL_INTERVAL_SEC);

    const pollStatusOnly = async () => {
      const statusRes = await callInstance("status");
      setStatusPayload(statusRes);
      if (isFullyConnected(statusRes)) {
        setQrPayload(null);
        toast({ title: "WhatsApp conectado", description: "QR ocultado." });
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        setQrCountdown(null);
      }
    };

    countdownRef.current = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev === null || prev <= 1) {
          pollStatusOnly();
          return QR_POLL_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [qrSrc, callInstance, toast]);

  const avisaStatus = parseAvisaStatusPayload(statusPayload);
  const connected = isFullyConnected(statusPayload);
  const instanceBound = avisaStatus.connected === true;
  const showQrButton = !statusLoading && avisaStatus.connected !== true;
  const whatsappLabel = formatWhatsAppFromJid(avisaStatus.jid);

  // Ao detectar conexão (ex.: após parear pelo QR), o front envia direto para AvisaAPI o webhook
  useEffect(() => {
    if (connected && webhookUrl && !wasConnectedRef.current) {
      wasConnectedRef.current = true;
      getAvisaToken().then(async (token) => {
        if (token) {
          try {
            const { ok } = await postWebhookAvisa(token, webhookUrl);
            if (ok) toast({ title: "Webhook registrado", description: "URL configurada na AvisaAPI." });
          } catch {
            const { data } = await supabase.functions.invoke("avisa-instance", { body: { action: "register_webhook", webhookUrl } });
            if ((data as { ok?: boolean })?.ok) toast({ title: "Webhook registrado", description: "URL configurada na AvisaAPI." });
          }
        } else {
          const { data } = await supabase.functions.invoke("avisa-instance", { body: { action: "register_webhook", webhookUrl } });
          if ((data as { ok?: boolean })?.ok) toast({ title: "Webhook registrado", description: "URL configurada na AvisaAPI." });
        }
      });
    }
    if (!connected) wasConnectedRef.current = false;
  }, [connected, webhookUrl, toast]);

  const saveToken = async () => {
    const v = tokenInput.trim();
    if (!v) {
      toast({ title: "Token vazio", variant: "destructive" });
      return;
    }
    setTokenSaving(true);
    try {
      const { error } = await supabase.from("integration_settings" as any).upsert(
        { key: SETTINGS_KEY, value: v, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      if (error) throw error;
      setTokenInput("");
      toast({ title: "Token salvo" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" });
    } finally {
      setTokenSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/20 p-4">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Token AvisaAPI</Label>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 flex">
            <Input
              type={showToken ? "text" : "password"}
              placeholder="Bearer token"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="font-mono text-sm pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
              onClick={() => setShowToken((v) => !v)}
              title={showToken ? "Ocultar token" : "Mostrar token"}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <Button onClick={saveToken} disabled={tokenSaving}>
            {tokenSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Status:</span>
        {statusLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : statusPayload?.error ? (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            {statusPayload.error}
          </Badge>
        ) : connected || instanceBound ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Conectado
            </Badge>
            {whatsappLabel && (
              <Badge variant="outline" className="text-sm font-medium">
                {whatsappLabel}
              </Badge>
            )}
          </div>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Desconectado
          </Badge>
        )}
        <Button variant="outline" size="sm" onClick={loadStatus} disabled={statusLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-1", statusLoading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="flex flex-wrap gap-2">
          {showQrButton && (
            <Button onClick={loadQr} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
              Obter QR Code
            </Button>
          )}
          <Button variant="destructive" onClick={disconnect} disabled={loading}>
            <Unplug className="h-4 w-4 mr-2" />
            Desconectar
          </Button>
        </div>
        {qrSrc && (
          <div className="flex flex-col items-center gap-2 border rounded-lg p-3 bg-white dark:bg-zinc-900">
            {qrCountdown != null && (
              <div className="flex flex-col items-center rounded-lg bg-muted/80 px-6 py-2">
                <span className="text-2xl font-bold tabular-nums">{qrCountdown}s</span>
              </div>
            )}
            <img src={qrSrc} alt="QR Code" className="w-48 h-48 object-contain" />
          </div>
        )}
      </div>
    </div>
  );
}
