import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Counsellor = {
  name: string;
  email: string;
};

export type WellbeingSettings = {
  teleManasNumber: string;
  counsellors: Counsellor[];
  adminPhone: string | null;
  adminLabel: string | null;
  loading: boolean;
};

/**
 * Builds a confidential pre-drafted mailto: URL for contacting a counsellor.
 * Does not pre-fill any student PII or post content, keeping full autonomy with the student.
 */
export function buildCounsellorMailto(counsellor: Counsellor): string {
  const subject = "Request to talk to a counsellor";
  const body = `Hello ${counsellor.name},

I'm a student at SRM University-AP and I would like to talk to a counsellor.
Could you let me know a time that works?

Name: 
Programme and year: 
Best way to reach me: 

Thank you.`;

  return `mailto:${counsellor.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function useWellbeingSettings(): WellbeingSettings {
  const [counsellors, setCounsellors] = useState<Counsellor[]>([]);
  const [adminPhone, setAdminPhone] = useState<string | null>(null);
  const [adminLabel, setAdminLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("platform_settings")
          .select("id, value")
          .in("id", ["wellbeing_counsellors", "wellbeing_admin_phone", "wellbeing_admin_label"]);

        if (error) {
          console.error("Could not fetch wellbeing settings:", error);
          if (mounted) setLoading(false);
          return;
        }

        if (data && mounted) {
          for (const item of data) {
            if (item.id === "wellbeing_counsellors" && item.value) {
              try {
                const parsed = typeof item.value === "string" ? JSON.parse(item.value) : item.value;
                if (Array.isArray(parsed)) {
                  setCounsellors(
                    parsed.filter(
                      (c: unknown): c is Counsellor =>
                        typeof c === "object" &&
                        c !== null &&
                        "name" in c &&
                        "email" in c &&
                        typeof (c as Record<string, unknown>).name === "string" &&
                        typeof (c as Record<string, unknown>).email === "string"
                    )
                  );
                }
              } catch (e) {
                console.error("Failed to parse wellbeing_counsellors:", e);
              }
            } else if (item.id === "wellbeing_admin_phone" && item.value) {
              setAdminPhone(
                typeof item.value === "string"
                  ? item.value.replace(/^"|"$/g, "")
                  : String(item.value)
              );
            } else if (item.id === "wellbeing_admin_label" && item.value) {
              setAdminLabel(
                typeof item.value === "string"
                  ? item.value.replace(/^"|"$/g, "")
                  : String(item.value)
              );
            }
          }
        }
      } catch (err) {
        console.error("Error reading wellbeing settings:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSettings();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    teleManasNumber: "14416",
    counsellors,
    adminPhone,
    adminLabel,
    loading,
  };
}
