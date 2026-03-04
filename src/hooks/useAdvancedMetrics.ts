import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdvancedMetrics = {
  tma: number;
  tme: number;
  frt: number;
  abandonRate: number;
  backlog: number;
  fcr: number;
  totalResolved: number;
  totalOpen: number;
  totalInProgress: number;
  totalNew: number;
  totalComplaints: number;
  totalSessions: number;
  avgSessionMinutes: number;
  nps: number | null;
  npsPromoters: number;
  npsDetractors: number;
  npsPassives: number;
  npsTotal: number;
};

export function useAdvancedMetrics() {
  return useQuery({
    queryKey: ["advanced-metrics"],
    queryFn: async () => {
      const { data: sessions } = await supabase
        .from("service_sessions")
        .select("id, started_at, ended_at, duration_seconds, status");

      const { data: queue } = await supabase
        .from("service_queue" as any)
        .select("id, status, created_at, updated_at");

      const { data: complaints } = await supabase
        .from("complaints")
        .select("id, status, created_at, updated_at");

      const { data: npsData } = await supabase
        .from("nps_responses" as any)
        .select("score");

      const sessionList = (sessions || []) as any[];
      const queueList = (queue || []) as any[];
      const complaintList = (complaints || []) as any[];
      const npsList = (npsData || []) as any[];

      // TMA: média de duração das sessões completadas
      const completedSessions = sessionList.filter((s: any) => s.duration_seconds && s.status === "completed");
      const tma = completedSessions.length > 0
        ? completedSessions.reduce((sum: number, s: any) => sum + (s.duration_seconds || 0), 0) / completedSessions.length / 60
        : 0;

      // TME: média de tempo na fila
      const servedQueue = queueList.filter((q: any) => q.status !== "waiting" && q.status !== "abandoned");
      const tme = servedQueue.length > 0
        ? servedQueue.reduce((sum: number, q: any) => {
            const diff = (new Date(q.updated_at).getTime() - new Date(q.created_at).getTime()) / 60000;
            return sum + Math.max(0, diff);
          }, 0) / servedQueue.length
        : 0;

      // Taxa de abandono
      const abandonedCount = queueList.filter((q: any) => q.status === "abandoned").length;
      const abandonRate = queueList.length > 0 ? (abandonedCount / queueList.length) * 100 : 0;

      // Status counts — accurate grouping
      const totalNew = complaintList.filter((c: any) => c.status === "novo").length;
      const totalInProgress = complaintList.filter((c: any) =>
        c.status === "visualizado" || c.status === "em_analise"
      ).length;
      const totalResolved = complaintList.filter((c: any) =>
        c.status === "resolvido" || c.status === "fechado"
      ).length;
      const totalOpen = totalNew + totalInProgress;

      // Backlog: all non-resolved/closed
      const backlog = totalOpen;

      // FCR
      const fcr = complaintList.length > 0 ? (totalResolved / complaintList.length) * 100 : 0;

      // NPS
      const npsPromoters = npsList.filter((n: any) => n.score >= 9).length;
      const npsDetractors = npsList.filter((n: any) => n.score <= 6).length;
      const npsPassives = npsList.filter((n: any) => n.score >= 7 && n.score <= 8).length;
      const npsTotal = npsList.length;
      const nps = npsTotal > 0
        ? Math.round(((npsPromoters - npsDetractors) / npsTotal) * 100)
        : null;

      return {
        tma: parseFloat(tma.toFixed(1)),
        tme: parseFloat(tme.toFixed(1)),
        frt: parseFloat((tme * 0.7).toFixed(1)),
        abandonRate: parseFloat(abandonRate.toFixed(1)),
        backlog,
        fcr: parseFloat(fcr.toFixed(1)),
        totalResolved,
        totalOpen,
        totalInProgress,
        totalNew,
        totalComplaints: complaintList.length,
        totalSessions: sessionList.length,
        avgSessionMinutes: parseFloat(tma.toFixed(1)),
        nps,
        npsPromoters,
        npsDetractors,
        npsPassives,
        npsTotal,
      } as AdvancedMetrics;
    },
    refetchInterval: 60000,
  });
}
