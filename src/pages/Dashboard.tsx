import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChannelMetrics } from "@/components/dashboard/ChannelMetrics";
import { ActiveConversations } from "@/components/dashboard/ActiveConversations";
import { AgentPerformance } from "@/components/dashboard/AgentPerformance";
import { useComplaintStats } from "@/hooks/useComplaints";
import {
  MessageSquare,
  ClipboardCheck,
  Clock,
  AlertTriangle,
} from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading } = useComplaintStats();

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral dos indicadores de atendimento
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total de Solicitações"
          value={stats?.total ?? 0}
          icon={<MessageSquare className="h-5 w-5 text-metadesk-yellow" />}
          isLoading={isLoading}
          description="Quantidade total de solicitações registradas na plataforma"
        />
        <StatCard
          title="Resolvidas"
          value={stats?.resolved ?? 0}
          icon={<ClipboardCheck className="h-5 w-5 text-metadesk-green" />}
          isLoading={isLoading}
          description="Solicitações finalizadas com resolução"
        />
        <StatCard
          title="Em Andamento"
          value={stats?.inProgress ?? 0}
          icon={<Clock className="h-5 w-5 text-metadesk-purple" />}
          isLoading={isLoading}
          description="Solicitações que estão sendo tratadas por um responsável"
        />
        <StatCard
          title="Pendentes"
          value={stats?.pending ?? 0}
          icon={<AlertTriangle className="h-5 w-5 text-metadesk-blue" />}
          isLoading={isLoading}
          description="Solicitações aguardando análise ou atribuição"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChannelMetrics stats={stats} isLoading={isLoading} />
        <ActiveConversations />
      </div>

      <div className="mb-6">
        <AgentPerformance />
      </div>
    </MainLayout>
  );
}
