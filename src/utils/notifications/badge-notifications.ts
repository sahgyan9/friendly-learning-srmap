
import { supabase } from "@/integrations/supabase/client";
import { getUserById } from "@/integrations/supabase/services/users";
import { createNotification } from "@/integrations/supabase/services/notifications";

export const handleBadgeAwardNotification = async (payload: {
  record: {
    id: string;
    user_id: string;
    badge_type_id: string;
    awarded_by: string;
    awarded_at: string;
    notes?: string;
  };
  badge_type: {
    name: string;
    icon: string;
    description: string;
  };
}) => {
  try {
    const { record, badge_type } = payload;
    
    // Get awarder's name
    const awarder = await getUserById(record.awarded_by);
    const awarderName = awarder?.name || "An administrator";

    // Create notification
    await createNotification({
      user_id: record.user_id,
      type: "badge",
      title: "New Badge Awarded! 🎉",
      content: `${awarderName} awarded you the ${badge_type.icon} ${badge_type.name} badge${record.notes ? `: "${record.notes}"` : ''}`,
      data: {
        badge_id: record.id,
        badge_type_id: record.badge_type_id,
        badge_name: badge_type.name,
        badge_icon: badge_type.icon,
        awarded_by: record.awarded_by,
        awarded_at: record.awarded_at
      },
      created_at: record.awarded_at
    });

  } catch (error) {
    console.error("Error creating badge award notification:", error);
  }
};
