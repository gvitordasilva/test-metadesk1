import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const { complaint_id, description, type, category, channel, reporter_name, is_anonymous } = await req.json();

    if (!description) throw new Error("Description is required");

    const systemPrompt = `Você é um analista de triagem de atendimento. Analise a solicitação e retorne APENAS um JSON válido (sem markdown, sem code blocks) com esta estrutura:
{
  "sentiment": "positivo" | "neutro" | "preocupado" | "frustrado" | "irritado",
  "urgency": "baixa" | "media" | "alta" | "critica",
  "scenario_summary": "Resumo de 1-2 frases do cenário/situação",
  "suggested_category": "categoria sugerida se diferente da atual",
  "risk_factors": ["lista de fatores de risco identificados"],
  "recommended_action": "ação recomendada em 1 frase"
}`;

    const userPrompt = `Analise esta solicitação:
- Tipo: ${type || "não informado"}
- Categoria: ${category || "não informada"}
- Canal: ${channel || "web"}
- Identificado: ${is_anonymous ? "Anônimo" : (reporter_name || "Sim")}
- Descrição: ${description}`;

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
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("OpenAI API error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";
    
    let triage;
    try {
      const jsonMatch = rawContent.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      triage = JSON.parse(jsonMatch);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      triage = {
        sentiment: "neutro",
        urgency: "media",
        scenario_summary: rawContent.slice(0, 200),
        risk_factors: [],
        recommended_action: "Análise manual necessária",
      };
    }

    // Save triage to complaint if complaint_id provided
    if (complaint_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from("complaints")
        .update({ 
          ai_triage: triage,
          last_sentiment: triage.sentiment,
        })
        .eq("id", complaint_id);
    }

    return new Response(JSON.stringify({ triage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("complaint-ai-triage error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
