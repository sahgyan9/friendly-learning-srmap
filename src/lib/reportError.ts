// error_reports isn't in the generated Supabase types yet (types.ts is
// generated from the live schema, which this migration hasn't been applied
// to at generation time) -- same `as any` workaround used elsewhere in this
// repo for tables ahead of the generated types.
import { supabase } from "@/integrations/supabase/client";

export async function reportErrorToAdmin(message: string): Promise<void> {
  const { error } = await (supabase as any).from("error_reports").insert({
    message: message.slice(0, 2000),
    route: typeof window !== "undefined" ? window.location.pathname : null,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });

  if (error) throw error;
}
