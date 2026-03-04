import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const channelLabels: Record<string, string> = {
  chatbot: "Chatbot Assistido",
  web: "Formulário Escrito",
  voice: "Voz IA",
  whatsapp: "WhatsApp",
  phone: "Voz IA",
  chat: "Chatbot Assistido",
};

const channelColors: Record<string, string> = {
  "Chatbot Assistido": "#7ae4ff",
  "Formulário Escrito": "#4deb92",
  "Voz IA": "#a18aff",
  "WhatsApp": "#25D366",
  Outros: "#888888",
};

const statusSatisfacao: Record<string, { label: string; color: string }> = {
  resolvido: { label: "Resolvido", color: "#4deb92" },
  fechado: { label: "Fechado", color: "#a1ecb7" },
  em_analise: { label: "Em Análise", color: "#f5ff55" },
  visualizado: { label: "Visualizado", color: "#c4b5fd" },
  novo: { label: "Novo", color: "#ffb07a" },
};

interface DateRange {
  from: Date;
  to: Date;
}

function processComplaints(complaints: any[], sessions: any[], range: DateRange) {
  const days = eachDayOfInterval({ start: range.from, end: range.to });

  // Build a map of complaint_id -> avg duration from sessions
  const sessionDurations: Record<string, number> = {};
  sessions.forEach((s: any) => {
    if (s.duration_seconds && s.complaint_id) {
      if (!sessionDurations[s.complaint_id]) {
        sessionDurations[s.complaint_id] = s.duration_seconds / 60;
      }
    }
  });

  const dailyData = days.map((date) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const dayComplaints = complaints.filter((c) => {
      const d = new Date(c.created_at);
      return d >= date && d < nextDay;
    });

    const atendimentos = dayComplaints.filter((c) => c.assigned_to || c.status !== "novo").length;
    const solicitacoes = dayComplaints.length;

    // TMA from real sessions
    const dayResolved = dayComplaints.filter((c) => c.status === "resolvido" || c.status === "fechado");
    let tma = 0;
    const withDuration = dayResolved.filter((c) => sessionDurations[c.id]);
    if (withDuration.length > 0) {
      tma = parseFloat((withDuration.reduce((sum, c) => sum + sessionDurations[c.id], 0) / withDuration.length).toFixed(1));
    }

    const label = format(date, "dd/MM", { locale: ptBR });
    const name = days.length <= 14
      ? `${dayNames[date.getDay()]} ${label}`
      : label;

    return { name, atendimentos, solicitacoes, tma };
  });

  // Channel distribution
  const channelCount: Record<string, number> = {};
  complaints.forEach((c) => {
    const label = channelLabels[c.channel || ""] || "Outros";
    channelCount[label] = (channelCount[label] || 0) + 1;
  });
  const total = complaints.length || 1;
  const channelData = Object.entries(channelCount).map(([name, count]) => ({
    name,
    value: parseFloat(((count / total) * 100).toFixed(1)),
    color: channelColors[name] || "#888888",
  }));

  // Status distribution
  const statusCount: Record<string, number> = {};
  complaints.forEach((c) => {
    statusCount[c.status] = (statusCount[c.status] || 0) + 1;
  });
  const satisfacaoData = Object.entries(statusCount).map(([status, count]) => ({
    name: statusSatisfacao[status]?.label || status,
    value: parseFloat(((count / total) * 100).toFixed(1)),
    color: statusSatisfacao[status]?.color || "#888888",
  }));

  // Summary metrics
  const totalAtendimentos = dailyData.reduce((s, d) => s + d.atendimentos, 0);
  const totalSolicitacoes = dailyData.reduce((s, d) => s + d.solicitacoes, 0);
  const resolvedAll = complaints.filter((c) => c.status === "resolvido" || c.status === "fechado");
  const inProgressAll = complaints.filter((c) => c.status === "visualizado" || c.status === "em_analise");
  const newAll = complaints.filter((c) => c.status === "novo");

  // TMA from real session data
  const withSessionDuration = resolvedAll.filter((c) => sessionDurations[c.id]);
  const avgTma = withSessionDuration.length > 0
    ? parseFloat((withSessionDuration.reduce((sum, c) => sum + sessionDurations[c.id], 0) / withSessionDuration.length).toFixed(1))
    : 0;

  return {
    dailyData,
    channelData,
    satisfacaoData,
    total: complaints.length,
    summary: {
      totalAtendimentos,
      totalSolicitacoes,
      avgTma,
      totalResolved: resolvedAll.length,
      totalInProgress: inProgressAll.length,
      totalNew: newAll.length,
    },
  };
}

export function useMonitoringData(range?: DateRange, comparisonRange?: DateRange | null) {
  const effectiveRange = range || {
    from: startOfDay(subDays(new Date(), 6)),
    to: endOfDay(new Date()),
  };

  return useQuery({
    queryKey: ["monitoring-real-data", effectiveRange.from.toISOString(), effectiveRange.to.toISOString(), comparisonRange?.from?.toISOString() || "none"],
    queryFn: async () => {
      // Determine the earliest date we need
      const earliest = comparisonRange ? (comparisonRange.from < effectiveRange.from ? comparisonRange.from : effectiveRange.from) : effectiveRange.from;

      const [{ data: complaints, error }, { data: sessions }] = await Promise.all([
        supabase
          .from("complaints")
          .select("id, status, type, category, channel, created_at, updated_at, assigned_to")
          .gte("created_at", earliest.toISOString())
          .lte("created_at", (comparisonRange ? (effectiveRange.to > comparisonRange.to ? effectiveRange.to : comparisonRange.to) : effectiveRange.to).toISOString()),
        supabase
          .from("service_sessions")
          .select("complaint_id, duration_seconds, status")
          .eq("status", "completed")
          .not("duration_seconds", "is", null),
      ]);

      if (error) throw error;

      const sessionList = (sessions || []) as any[];

      const mainComplaints = (complaints || []).filter((c) => {
        const d = new Date(c.created_at);
        return d >= effectiveRange.from && d <= effectiveRange.to;
      });

      const main = processComplaints(mainComplaints, sessionList, effectiveRange);

      let comparison = null;
      if (comparisonRange) {
        const compComplaints = (complaints || []).filter((c) => {
          const d = new Date(c.created_at);
          return d >= comparisonRange.from && d <= comparisonRange.to;
        });
        comparison = processComplaints(compComplaints, sessionList, comparisonRange);
      }

      return { ...main, comparison, lastUpdated: new Date() };
    },
    refetchInterval: 60000,
  });
}
