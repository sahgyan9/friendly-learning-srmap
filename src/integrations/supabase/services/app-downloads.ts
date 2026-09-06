import { supabase } from "@/integrations/supabase/client";

export interface AppDownloadStats {
  app_name: string;
  total_downloads: number;
  downloads_7d: number;
  downloads_30d: number;
  by_type: Record<string, number>;
}

export async function recordAppDownload(
  appName: string = "oberleaf",
  downloadType: "setup_bat" | "setup_zip" | "powershell_installer" | "powershell_copy" = "setup_bat",
  platform: string = "windows"
): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc("record_app_download" as any, {
      p_app_name: appName,
      p_download_type: downloadType,
      p_platform: platform,
    });
    if (error) {
      console.warn("[app-downloads] Failed to record download:", error.message);
      return null;
    }
    return data as number;
  } catch (err) {
    console.warn("[app-downloads] Exception recording download:", err);
    return null;
  }
}

export async function getAppDownloadStats(
  appName: string = "oberleaf"
): Promise<AppDownloadStats | null> {
  try {
    const { data, error } = await supabase.rpc("get_app_download_stats" as any, {
      p_app_name: appName,
    });
    if (error) {
      console.warn("[app-downloads] Failed to fetch stats:", error.message);
      return null;
    }
    return data as AppDownloadStats;
  } catch (err) {
    console.warn("[app-downloads] Exception fetching stats:", err);
    return null;
  }
}
