import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Round-robin assignment: picks the online attendant with the oldest last_assigned_at.
 * Returns the assigned user_id, or null if no online attendants.
 */
export function useRoundRobinAssignment() {
  const assignToNextAttendant = useCallback(async (queueItemId: string): Promise<string | null> => {
    try {
      // 1. Fetch all online attendants ordered by last_assigned_at (oldest first = round-robin)
      const { data: onlineAttendants, error: attendantError } = await supabase
        .from("attendant_profiles")
        .select("id, user_id, full_name, last_assigned_at" as any)
        .eq("status", "online")
        .order("last_assigned_at", { ascending: true })
        .limit(1);

      if (attendantError) {
        console.error("Error fetching online attendants:", attendantError);
        return null;
      }

      if (!onlineAttendants || onlineAttendants.length === 0) {
        console.log("No online attendants available for assignment");
        return null;
      }

      const nextAttendant = onlineAttendants[0] as any;

      // 2. Assign the queue item to this attendant
      const { error: assignError } = await supabase
        .from("service_queue" as any)
        .update({
          assigned_to: nextAttendant.user_id,
          status: "in_progress",
        })
        .eq("id", queueItemId);

      if (assignError) {
        console.error("Error assigning queue item:", assignError);
        return null;
      }

      // 3. Update last_assigned_at for round-robin tracking
      await supabase
        .from("attendant_profiles")
        .update({ last_assigned_at: new Date().toISOString() } as any)
        .eq("id", nextAttendant.id);

      console.log(`Queue item ${queueItemId} assigned to ${nextAttendant.full_name}`);
      return nextAttendant.user_id;
    } catch (err) {
      console.error("Round-robin assignment error:", err);
      return null;
    }
  }, []);

  const checkOnlineAttendants = useCallback(async (): Promise<number> => {
    const { count, error } = await supabase
      .from("attendant_profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "online");

    if (error) {
      console.error("Error checking online attendants:", error);
      return 0;
    }
    return count || 0;
  }, []);

  return { assignToNextAttendant, checkOnlineAttendants };
}
