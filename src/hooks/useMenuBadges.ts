import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServiceQueue } from "./useServiceQueue";
import { useComplaintStats } from "./useComplaints";

export function useMenuBadges() {
  const queryClient = useQueryClient();
  const { data: queueItems } = useServiceQueue({ 
    status: ["waiting"] 
  });
  const { data: stats } = useComplaintStats();

  // Realtime: invalidate complaint-stats when complaints change
  useEffect(() => {
    const channel = supabase
      .channel("menu-badges-complaints")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "complaints" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["complaint-stats"] });
          queryClient.invalidateQueries({ queryKey: ["complaints"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  
  return {
    atendimento: queueItems?.length ?? 0,
    solicitacoes: stats ? stats.total - stats.resolved - stats.closed - stats.inProgress : 0,
  };
}
