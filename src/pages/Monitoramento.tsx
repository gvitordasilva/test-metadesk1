
import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIInsightCard } from "@/components/monitoring/AIInsightCard";
import { ReportGenerator } from "@/components/monitoring/ReportGenerator";
import { AtendimentosList } from "@/components/monitoring/AtendimentosList";
import { MetricsSLAPanel } from "@/components/monitoring/MetricsSLAPanel";
import { SolicitacoesList } from "@/components/monitoring/SolicitacoesList";
import { AtividadesList } from "@/components/monitoring/AtividadesList";
import { PeriodFilter, PeriodSelection } from "@/components/monitoring/PeriodFilter";
import { useMonitoringData } from "@/hooks/useMonitoringData";
import { useAdvancedMetrics } from "@/hooks/useAdvancedMetrics";
import { Loader2, Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatDistanceToNow, startOfDay, subDays, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToCsv } from "@/lib/exportCsv";
import { cn } from "@/lib/utils";

function ComparisonBadge({ current, previous, suffix = "", invert = false }: { current: number; previous: number; suffix?: string; invert?: boolean }) {
  if (previous === 0) return null;
  const diff = ((current - previous) / previous) * 100;
  const isPositive = invert ? diff < 0 : diff > 0;
  const isNeutral = Math.abs(diff) < 1;

  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs font-medium ml-2 px-1.5 py-0.5 rounded",
      isNeutral ? "bg-muted text-muted-foreground" :
        isPositive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    )}>
      {isNeutral ? <Minus className="h-3 w-3" /> : isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(diff).toFixed(1)}%{suffix}
    </span>
  );
}

export default function Monitoramento() {
  const [period, setPeriod] = useState<PeriodSelection>({
    from: startOfDay(subDays(new Date(), 6)),
    to: endOfDay(new Date()),
    label: "Últimos 7 dias",
  });
  const [comparisonPeriod, setComparisonPeriod] = useState<PeriodSelection | null>(null);

  const { data, isLoading } = useMonitoringData(period, comparisonPeriod);
  const { data: advMetrics } = useAdvancedMetrics();

  const dailyData = data?.dailyData || [];
  const channelData = data?.channelData || [];
  const satisfacaoData = data?.satisfacaoData || [];
  const comparison = data?.comparison || null;

  const reportMetrics = {
    dailyData,
    channelData,
    satisfacaoData,
    period: period.label,
  };

  const updatedLabel = data?.lastUpdated
    ? `Atualizado ${formatDistanceToNow(data.lastUpdated, { addSuffix: true, locale: ptBR })}`
    : "Carregando...";

  const handleExportDashboard = () => {
    exportToCsv(
      "dashboard-metricas",
      ["Dia", "Atendimentos", "Solicitações", "TMR (min)"],
      dailyData.map((d: any) => [d.name, d.atendimentos, d.solicitacoes, d.tma])
    );
  };

  return (
    <MainLayout>
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Monitoramento</h1>
            <p className="text-muted-foreground">
              Indicadores de performance e qualidade — {data?.total || 0} solicitações no período
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ReportGenerator metrics={reportMetrics} />
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportDashboard}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Badge variant="outline" className="bg-green-100 text-green-800">
              {updatedLabel}
            </Badge>
          </div>
        </div>

        {/* Period filter bar */}
        <div className="mb-6 p-3 rounded-lg border bg-card">
          <PeriodFilter
            period={period}
            comparisonPeriod={comparisonPeriod}
            onPeriodChange={setPeriod}
            onComparisonChange={setComparisonPeriod}
          />
        </div>

        {/* Summary cards with comparison */}
        {data?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card title="Quantidade total de solicitações registradas no período selecionado">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Solicitações</p>
                <p className="text-2xl font-bold">
                  {data.summary.totalSolicitacoes}
                  {comparison && <ComparisonBadge current={data.summary.totalSolicitacoes} previous={comparison.summary.totalSolicitacoes} />}
                </p>
                {comparison && <p className="text-xs text-muted-foreground mt-1">vs {comparison.summary.totalSolicitacoes} anterior</p>}
              </CardContent>
            </Card>
            <Card title="Solicitações recém-criadas que ainda não foram visualizadas ou atribuídas">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Novas</p>
                <p className="text-2xl font-bold text-orange-500">
                  {data.summary.totalNew}
                  {comparison && <ComparisonBadge current={data.summary.totalNew} previous={comparison.summary.totalNew} invert />}
                </p>
                {comparison && <p className="text-xs text-muted-foreground mt-1">vs {comparison.summary.totalNew} anterior</p>}
              </CardContent>
            </Card>
            <Card title="Solicitações que já foram atribuídas e estão sendo tratadas por um responsável">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Em Andamento</p>
                <p className="text-2xl font-bold text-blue-500">
                  {data.summary.totalInProgress}
                  {comparison && <ComparisonBadge current={data.summary.totalInProgress} previous={comparison.summary.totalInProgress} />}
                </p>
                {comparison && <p className="text-xs text-muted-foreground mt-1">vs {comparison.summary.totalInProgress} anterior</p>}
              </CardContent>
            </Card>
            <Card title="Solicitações finalizadas com resolução no período selecionado">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Resolvidas</p>
                <p className="text-2xl font-bold text-green-500">
                  {data.summary.totalResolved}
                  {comparison && <ComparisonBadge current={data.summary.totalResolved} previous={comparison.summary.totalResolved} />}
                </p>
                {comparison && <p className="text-xs text-muted-foreground mt-1">vs {comparison.summary.totalResolved} anterior</p>}
              </CardContent>
            </Card>
            <Card title="Tempo Médio de Resolução — média em minutos entre a criação e a resolução de uma solicitação">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">TMR Médio (min)</p>
                <p className="text-2xl font-bold">
                  {data.summary.avgTma}
                  {comparison && <ComparisonBadge current={data.summary.avgTma} previous={comparison.summary.avgTma} invert />}
                </p>
                {comparison && <p className="text-xs text-muted-foreground mt-1">vs {comparison.summary.avgTma} min anterior</p>}
              </CardContent>
            </Card>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="dashboard" className="mb-6">
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="atendimentos">Atendimentos</TabsTrigger>
              <TabsTrigger value="solicitacoes">Solicitações</TabsTrigger>
              <TabsTrigger value="satisfacao">Satisfação</TabsTrigger>
              <TabsTrigger value="atividades">Atividades</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <div className="mb-6">
                <MetricsSLAPanel />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Volume de Atendimentos ({period.label})</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} />
                          <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                          <Legend />
                          <Line type="monotone" dataKey="atendimentos" stroke="#f5ff55" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Atendimentos" />
                          <Line type="monotone" dataKey="solicitacoes" stroke="#4deb92" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Solicitações" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <AIInsightCard
                      indicatorName="Volume de Atendimentos"
                      metrics={{
                        totalAtendimentos: dailyData.reduce((s, d) => s + d.atendimentos, 0),
                        totalSolicitacoes: dailyData.reduce((s, d) => s + d.solicitacoes, 0),
                        mediaAtendimentosDia: dailyData.length ? Math.round(dailyData.reduce((s, d) => s + d.atendimentos, 0) / dailyData.length) : 0,
                        picoAtendimentos: dailyData.length ? Math.max(...dailyData.map(d => d.atendimentos)) : 0,
                        dados: dailyData.map(d => ({ dia: d.name, atend: d.atendimentos, solic: d.solicitacoes })),
                      }}
                      className="mt-4"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Canais de Atendimento</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="h-[300px]">
                      {channelData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={channelData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                              {channelData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value}%`, "Volume"]} labelFormatter={() => ""} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">Sem dados</div>
                      )}
                    </div>
                    <AIInsightCard
                      indicatorName="Canais de Atendimento"
                      metrics={{
                        distribuicao: channelData.map(c => ({ canal: c.name, percentual: c.value })),
                        canalPrincipal: channelData[0]?.name || "N/A",
                        percentualPrincipal: channelData[0]?.value || 0,
                      }}
                      className="mt-4"
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Tempo Médio de Resolução (min)</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} />
                          <YAxis axisLine={false} tickLine={false} label={{ value: "Minutos", angle: -90, position: "insideLeft", style: { textAnchor: "middle" } }} />
                          <Tooltip cursor={{ fill: "rgba(245,255,85,0.1)" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                          <Legend />
                          <Bar dataKey="tma" fill="#a18aff" name="TMR (min)" radius={[4, 4, 0, 0]} barSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <AIInsightCard
                      indicatorName="Tempo Médio de Resolução"
                      metrics={{
                        tmaGeral: dailyData.length ? (dailyData.reduce((s, d) => s + d.tma, 0) / dailyData.filter(d => d.tma > 0).length || 0).toFixed(1) : "0",
                        tmaMenor: dailyData.filter(d => d.tma > 0).length ? Math.min(...dailyData.filter(d => d.tma > 0).map(d => d.tma)) : 0,
                        tmaMaior: dailyData.length ? Math.max(...dailyData.map(d => d.tma)) : 0,
                        dados: dailyData.map(d => ({ dia: d.name, tma: d.tma })),
                      }}
                      className="mt-4"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Distribuição por Status</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="h-[300px]">
                      {satisfacaoData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={satisfacaoData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                              {satisfacaoData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value}%`, ""]} labelFormatter={(label) => label} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">Sem dados</div>
                      )}
                    </div>
                    <AIInsightCard
                      indicatorName="Distribuição por Status"
                      metrics={{
                        distribuicao: satisfacaoData.map(s => ({ status: s.name, percentual: s.value })),
                      }}
                      className="mt-4"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="atendimentos" className="mt-6">
              <AtendimentosList />
            </TabsContent>

            <TabsContent value="solicitacoes" className="mt-6">
              <SolicitacoesList />
            </TabsContent>

            <TabsContent value="satisfacao" className="mt-6">
              <div className="space-y-6">
                <MetricsSLAPanel />
                <Card>
                  <CardHeader>
                    <CardTitle>Métricas de Satisfação e Qualidade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm mb-4">
                      Os indicadores CSAT, NPS e CES serão calculados automaticamente quando pesquisas de satisfação forem habilitadas.
                      Atualmente o FCR (Resolução no Primeiro Contato) é calculado com base nos chamados resolvidos vs. total.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className={advMetrics?.nps != null ? "" : "border-dashed"}>
                        <CardContent className="p-4 text-center">
                          <p className="text-xs text-muted-foreground mb-1">NPS</p>
                          <p className={`text-2xl font-bold ${advMetrics?.nps != null ? (advMetrics.nps >= 50 ? "text-green-600" : advMetrics.nps >= 0 ? "text-yellow-600" : "text-red-600") : "text-muted-foreground/50"}`}>
                            {advMetrics?.nps != null ? advMetrics.nps : "—"}
                          </p>
                          {advMetrics?.npsTotal ? (
                            <p className="text-[10px] text-muted-foreground">
                              {advMetrics.npsTotal} respostas • {advMetrics.npsPromoters} promotores • {advMetrics.npsDetractors} detratores
                            </p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground">Aguardando respostas</p>
                          )}
                        </CardContent>
                      </Card>
                      <Card className="border-dashed">
                        <CardContent className="p-4 text-center">
                          <p className="text-xs text-muted-foreground mb-1">CSAT</p>
                          <p className="text-2xl font-bold text-muted-foreground/50">—</p>
                          <p className="text-[10px] text-muted-foreground">Em breve</p>
                        </CardContent>
                      </Card>
                      <Card className="border-dashed">
                        <CardContent className="p-4 text-center">
                          <p className="text-xs text-muted-foreground mb-1">CES</p>
                          <p className="text-2xl font-bold text-muted-foreground/50">—</p>
                          <p className="text-[10px] text-muted-foreground">Em breve</p>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="atividades" className="mt-6">
              <AtividadesList />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}
