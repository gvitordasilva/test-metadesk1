
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { hora: "09h", ativos: 12 },
  { hora: "10h", ativos: 19 },
  { hora: "11h", ativos: 15 },
  { hora: "12h", ativos: 8 },
  { hora: "13h", ativos: 10 },
  { hora: "14h", ativos: 22 },
  { hora: "15h", ativos: 27 },
  { hora: "16h", ativos: 21 },
  { hora: "17h", ativos: 16 },
  { hora: "18h", ativos: 11 },
];

export function ActiveConversations() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Conversas Ativas por Hora</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hora" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(245, 255, 85, 0.1)" }}
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Bar
                dataKey="ativos"
                fill="#4deb92"
                radius={[4, 4, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
