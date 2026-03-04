import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const { metrics, type } = await req.json();

    let systemPrompt: string;
    let userPrompt: string;

    if (type === "report") {
      systemPrompt = `Você é um analista de dados especializado em operações de atendimento ao cliente. 
Gere um relatório executivo completo em português brasileiro. O relatório deve conter:
1. ANÁLISE GERAL DO PERÍODO - Um parágrafo resumindo a performance global
2. VOLUME DE ATENDIMENTOS - Análise detalhada com tendências
3. CANAIS DE ATENDIMENTO - Distribuição e recomendações
4. TEMPO MÉDIO DE ATENDIMENTO (TMA) - Análise de eficiência
5. SATISFAÇÃO DO CLIENTE - Análise dos índices e pontos de atenção
6. RECOMENDAÇÕES ESTRATÉGICAS - 3-5 ações concretas

Use linguagem profissional e objetiva. Formate com markdown.`;

      userPrompt = `Analise os seguintes dados do período e gere o relatório completo:\n\n${JSON.stringify(metrics, null, 2)}`;
    } else {
      systemPrompt = `Você é um analista de dados de atendimento ao cliente. 
Gere uma análise curta (2-3 frases) e objetiva em português sobre o indicador fornecido.
Identifique tendências, pontos positivos e alertas. Seja direto e use dados concretos.
Não use markdown, apenas texto corrido.`;

      userPrompt = `Analise o seguinte indicador: ${JSON.stringify(metrics)}`;
    }

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
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("OpenAI API error:", response.status, t);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "Análise não disponível.";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("monitoring-ai-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
