import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Activity, Download } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

const actionLabels: Record<string, string> = {
  status_change: "Alteração de Status",
  assignment: "Atribuição",
  workflow_change: "Alteração de Fluxo",
  workflow_step_advance: "Avanço de Etapa",
  note_added: "Nota Adicionada",
  field_update: "Atualização de Campo",
  created: "Criação",
  concluded: "Conclusão",
};

const fieldLabels: Record<string, string> = {
  status: "Status",
  assigned_to: "Responsável",
  workflow_id: "Fluxo",
  current_workflow_step_id: "Etapa do Fluxo",
  internal_notes: "Notas Internas",
  category: "Categoria",
  type: "Tipo",
  description: "Descrição",
};

export function AtividadesList() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["all-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaint_audit_log" as any)
        .select("*, complaints!complaint_audit_log_complaint_id_fkey(protocol_number)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const handleExport = () => {
    if (!activities?.length) return;
    exportToCsv(
      "atividades",
      ["Data/Hora", "Protocolo", "Ação", "Campo", "De", "Para", "Usuário"],
      activities.map((item: any) => [
        format(new Date(item.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
        item.complaints?.protocol_number || "",
        actionLabels[item.action] || item.action,
        fieldLabels[item.field_changed] || item.field_changed || "",
        item.old_value || "",
        item.new_value || "",
        item.user_email || "Sistema",
      ])
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Registro de Atividades da Plataforma
        </CardTitle>
        {activities && activities.length > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!activities?.length ? (
          <p className="text-muted-foreground text-center py-8">Nenhuma atividade registrada.</p>
        ) : (
          <div className="overflow-auto max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Campo</TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>Para</TableHead>
                  <TableHead>Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(item.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.complaints?.protocol_number || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {actionLabels[item.action] || item.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {fieldLabels[item.field_changed] || item.field_changed}
                    </TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate" title={item.old_value || ""}>
                      {item.old_value || "—"}
                    </TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate" title={item.new_value || ""}>
                      {item.new_value || "—"}
                    </TableCell>
                    <TableCell className="text-xs">{item.user_email || "Sistema"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
