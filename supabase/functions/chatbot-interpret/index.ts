const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userMessage, currentStep, conversationHistory, collectedSoFar } = await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const systemPrompt = `Você é um parser de mensagens de um chatbot de triagem de manifestações (reclamações, denúncias, sugestões).

Sua tarefa é extrair campos estruturados da mensagem do usuário, considerando o contexto da conversa.

Campos possíveis:
- type: tipo da manifestação ("Reclamação", "Denúncia" ou "Sugestão")
- category: categoria (para Reclamação: Atendimento, Produto/Serviço, Financeiro, Logística, Infraestrutura, Outro; para Denúncia: Assédio, Fraude, Corrupção, Irregularidade, Segurança, Outro; para Sugestão: Melhoria de Processo, Novo Serviço, Atendimento, Tecnologia, Outro)
- description: descrição detalhada da situação
- location: local onde ocorreu
- involved_parties: pessoas ou setores envolvidos
- is_anonymous: se o usuário quer anonimato (true/false)
- reporter_name: nome completo do usuário
- reporter_email: email do usuário
- reporter_phone: telefone do usuário
- wants_to_identify: se o usuário disse que quer se identificar (true/false)
- skip_field: se a resposta indica que quer pular/não tem info (true/false)
- go_back: se quer voltar ao formulário escrito (true/false)
- confirm_send: se confirma o envio (true/false/null se não relevante)
- wants_transfer: se o usuário quer falar com um atendente humano, ser transferido, falar com uma pessoa real (true/false)

Dados já coletados: ${JSON.stringify(collectedSoFar)}
Passo atual do chatbot: "${currentStep}"

Regras:
1. Extraia TODOS os campos que conseguir identificar na mensagem, mesmo que pertençam a passos futuros.
2. Se o usuário diz "não" ou "nenhum" para envolvidos, retorne skip_field: true.
3. Se o usuário diz algo como "sim, quero me identificar" ou fornece nome/dados pessoais, entenda como wants_to_identify: true e is_anonymous: false.
4. Normalize telefones removendo espaços extras mas mantendo o formato.
5. Se não conseguir extrair um campo, não o inclua no retorno.
6. Retorne APENAS o JSON, sem markdown.
7. Se o usuário expressa desejo de falar com um humano, atendente, pessoa real, ou ser transferido, retorne wants_transfer: true.`;

    const conversationContext = (conversationHistory || [])
      .map((m: { role: string; content: string }) => `${m.role === "bot" ? "Bot" : "Usuário"}: ${m.content}`)
      .join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Histórico da conversa:\n${conversationContext}\n\nMensagem atual do usuário: "${userMessage}"` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_fields",
              description: "Extract structured fields from the user message",
              parameters: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["Reclamação", "Denúncia", "Sugestão"] },
                  category: { type: "string" },
                  description: { type: "string" },
                  location: { type: "string" },
                  involved_parties: { type: "string" },
                  is_anonymous: { type: "boolean" },
                  wants_to_identify: { type: "boolean" },
                  reporter_name: { type: "string" },
                  reporter_email: { type: "string" },
                  reporter_phone: { type: "string" },
                  skip_field: { type: "boolean" },
                  go_back: { type: "boolean" },
                  confirm_send: { type: "boolean" },
                  wants_transfer: { type: "boolean" },
                },
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_fields" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ extracted: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chatbot-interpret error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", extracted: {} }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
