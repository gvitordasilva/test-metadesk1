# Fluxo do webhook AvisaAPI

## 1. Como a URL do webhook é preenchida

- **No frontend (AvisaInstancePanel):**
  - `baseUrl` = `import.meta.env.VITE_SUPABASE_URL` (ex.: `https://ivycdgjaocafikqitngp.supabase.co`)
  - `webhookUrl` = `baseUrl + "/functions/v1/avisa-webhook"`
  - Exemplo: `https://ivycdgjaocafikqitngp.supabase.co/functions/v1/avisa-webhook`

- **Na Edge Function (avisa-instance):**
  - Se o body vier com `webhookUrl` não vazio, usa esse valor.
  - Senão usa: `SUPABASE_URL + "/functions/v1/avisa-webhook"` (variável de ambiente do Supabase).

## 2. Requisição do navegador para a Edge Function

- **URL:** `POST https://<seu-projeto>.supabase.co/functions/v1/avisa-instance`
- **Headers:** (o cliente Supabase envia automaticamente)
  - `Content-Type: application/json`
  - `Authorization: Bearer <anon key ou session>`
  - `apikey: <anon key>`
- **Body (JSON):**
```json
{
  "action": "register_webhook",
  "webhookUrl": "https://ivycdgjaocafikqitngp.supabase.co/functions/v1/avisa-webhook"
}
```

## 3. O que a Edge Function envia para a AvisaAPI

- **URL:** `POST https://www.avisaapi.com.br/api/webhook`
- **Headers:**
  - `Authorization: Bearer <token AvisaAPI>` (vindo de env ou de `integration_settings`)
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Body (JSON):**
```json
{
  "webhook": "https://ivycdgjaocafikqitngp.supabase.co/functions/v1/avisa-webhook"
}
```

Para **remover** o webhook (ao desconectar), o body enviado à AvisaAPI é:
```json
{
  "webhook": ""
}
```

## 4. Resposta da Edge Function para o navegador

A Edge **sempre** responde com **HTTP 200**. O resultado da AvisaAPI vem no body:

```json
{
  "ok": true ou false,
  "status": 200,
  "webhookSent": "https://.../avisa-webhook",
  "data": { ... resposta da AvisaAPI ... }
}
```

Se aparecer **400** no navegador ao chamar `avisa-instance`, é resposta antiga da Edge (faça redeploy) ou erro de formato do request (confira o body na aba "Requisição" do DevTools).
