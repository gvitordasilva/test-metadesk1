import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { ComplaintStats } from "@/hooks/useComplaints";

interface ChannelMetricsProps {
  stats?: ComplaintStats;
  isLoading?: boolean;
}

const typeColors: Record<string, string> = {
  reclamacao: "#ef4444",
  denuncia: "#f97316",
  sugestao: "#8b5cf6",
  elogio: "#10b981",
};

export function ChannelMetrics({ stats, isLoading }: ChannelMetricsProps) {
  const data = stats?.byType.map((item) => ({
    name: item.label,
    value: item.count,
    color: typeColors[item.type] || "#6b7280",
  })) || [];

  const hasData = data.length > 0 && data.some((d) => d.value > 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Distribuição por Tipo</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[260px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="h-40 w-40 rounded-full" />
            </div>
          ) : !hasData ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Sem dados para exibir
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
                <Tooltip 
                  formatter={(value) => [`${value}`, 'Quantidade']} 
                  labelFormatter={() => ''}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
