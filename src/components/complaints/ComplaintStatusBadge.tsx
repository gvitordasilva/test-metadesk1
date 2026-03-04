import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ComplaintStatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  novo: {
    label: "Novo",
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
  visualizado: {
    label: "Visualizado",
    className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  },
  em_analise: {
    label: "Em Análise",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  resolvido: {
    label: "Resolvido",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  fechado: {
    label: "Fechado",
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  },
};

export function ComplaintStatusBadge({ status, className }: ComplaintStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-100 text-gray-800",
  };

  return (
    <Badge variant="secondary" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}

export function ComplaintTypeBadge({ type }: { type: string }) {
  const typeConfig: Record<string, { label: string; className: string }> = {
    reclamacao: {
      label: "Reclamação",
      className: "bg-red-100 text-red-800 hover:bg-red-100",
    },
    denuncia: {
      label: "Denúncia",
      className: "bg-orange-100 text-orange-800 hover:bg-orange-100",
    },
    sugestao: {
      label: "Sugestão",
      className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
    },
    elogio: {
      label: "Elogio",
      className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
    },
  };

  const config = typeConfig[type] || {
    label: type,
    className: "bg-gray-100 text-gray-800",
  };

  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
