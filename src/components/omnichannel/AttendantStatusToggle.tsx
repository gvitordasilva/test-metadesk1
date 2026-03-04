import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Circle, Coffee, Phone, LogOut } from "lucide-react";
import { toast } from "sonner";

const statusConfig = {
  online: { label: "Online", color: "bg-green-500", icon: Circle },
  busy: { label: "Ocupado", color: "bg-red-500", icon: Phone },
  break: { label: "Pausa", color: "bg-yellow-500", icon: Coffee },
  offline: { label: "Offline", color: "bg-gray-400", icon: LogOut },
} as const;

type AttendantStatus = keyof typeof statusConfig;

export function AttendantStatusToggle() {
  const { profile, updateStatus } = useAuth();
  const currentStatus = (profile?.status as AttendantStatus) || "offline";
  const config = statusConfig[currentStatus];

  const handleStatusChange = async (newStatus: AttendantStatus) => {
    if (newStatus === currentStatus) return;
    try {
      await updateStatus(newStatus);
      toast.success(`Status alterado para ${statusConfig[newStatus].label}`);
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
          {config.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(statusConfig) as AttendantStatus[]).map((status) => {
          const s = statusConfig[status];
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusChange(status)}
              className="gap-2"
            >
              <span className={`h-2 w-2 rounded-full ${s.color}`} />
              {s.label}
              {status === currentStatus && (
                <Badge variant="outline" className="ml-auto text-[10px]">
                  Atual
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
