
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type Agent = {
  name: string;
  photo: string;
  status: "online" | "offline" | "away" | "busy";
  atendimentos: number;
  resolucao: number;
  satisfacao: number;
  tma: string;
};

const agents: Agent[] = [
  {
    name: "Mariana Silva",
    photo: "https://randomuser.me/api/portraits/women/11.jpg",
    status: "online",
    atendimentos: 28,
    resolucao: 92,
    satisfacao: 94,
    tma: "04:20",
  },
  {
    name: "Carlos Oliveira",
    photo: "https://randomuser.me/api/portraits/men/32.jpg",
    status: "online",
    atendimentos: 24,
    resolucao: 88,
    satisfacao: 91,
    tma: "05:45",
  },
  {
    name: "Juliana Costa",
    photo: "https://randomuser.me/api/portraits/women/44.jpg",
    status: "away",
    atendimentos: 19,
    resolucao: 85,
    satisfacao: 90,
    tma: "06:12",
  },
  {
    name: "Eduardo Santos",
    photo: "https://randomuser.me/api/portraits/men/59.jpg",
    status: "busy",
    atendimentos: 22,
    resolucao: 76,
    satisfacao: 85,
    tma: "07:30",
  },
  {
    name: "Fernanda Lima",
    photo: "https://randomuser.me/api/portraits/women/67.jpg",
    status: "offline",
    atendimentos: 15,
    resolucao: 82,
    satisfacao: 88,
    tma: "05:50",
  },
];

export function AgentPerformance() {
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Desempenho da Equipe</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left font-medium p-4 text-sm">Agente</th>
                <th className="text-center font-medium p-4 text-sm">Atend.</th>
                <th className="text-center font-medium p-4 text-sm whitespace-nowrap">
                  Resolução
                </th>
                <th className="text-center font-medium p-4 text-sm whitespace-nowrap">
                  Satisfação
                </th>
                <th className="text-center font-medium p-4 text-sm">TMA</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.name} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-shrink-0">
                        <img
                          src={agent.photo}
                          alt={agent.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span
                          className={`status-dot absolute bottom-0 right-0 shadow-sm status-${agent.status}`}
                        ></span>
                      </div>
                      <span className="font-medium">{agent.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">{agent.atendimentos}</td>
                  <td className="p-4">
                    <div className="flex flex-col items-center gap-1">
                      <Progress value={agent.resolucao} className="h-2 w-16" />
                      <span className="text-xs">{agent.resolucao}%</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-center gap-1">
                      <Progress
                        value={agent.satisfacao}
                        className="h-2 w-16 [&>div]:bg-green-500"
                      />
                      <span className="text-xs">{agent.satisfacao}%</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <Badge variant="outline">{agent.tma}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
