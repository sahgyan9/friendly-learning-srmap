import { supabase } from "@/integrations/supabase/client";

export type ResourceKind = "drive" | "github" | "document" | "notes" | "link" | "video";

export type CommunityResource = {
  id: string;
  communityId: string;
  title: string;
  url: string;
  kind: ResourceKind;
  description?: string;
  addedByName: string;
  addedByAvatar?: string | null;
  isPinned?: boolean;
  createdAt: string;
};

const STORAGE_PREFIX = "fl_community_resources_";

export function detectResourceKind(url: string): ResourceKind {
  const lower = url.toLowerCase();
  if (lower.includes("github.com") || lower.includes("gitlab.com")) return "github";
  if (lower.includes("drive.google.com") || lower.includes("docs.google.com")) return "drive";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "video";
  if (lower.endsWith(".pdf") || lower.endsWith(".docx") || lower.endsWith(".ppt")) return "document";
  if (lower.includes("notion.so") || lower.includes("obsidian")) return "notes";
  return "link";
}

/**
 * Reads resources for a community. Stored client-side in localStorage.
 */
export async function getCommunityResources(
  communityId: string,
  _communityName?: string,
  _communityKind?: string,
): Promise<CommunityResource[]> {
  try {
    const key = `${STORAGE_PREFIX}${communityId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const items = JSON.parse(stored) as CommunityResource[];
      // Filter out any legacy dummy seeds that may have been saved in localStorage
      return items.filter((item) => !item.id.startsWith("res_seed_"));
    }
  } catch {
    // continue to empty
  }

  return [];
}

export async function addCommunityResource(
  communityId: string,
  resource: Omit<CommunityResource, "id" | "communityId" | "createdAt">,
): Promise<CommunityResource> {
  const newResource: CommunityResource = {
    ...resource,
    id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    communityId,
    createdAt: new Date().toISOString(),
  };

  try {
    const key = `${STORAGE_PREFIX}${communityId}`;
    const existingStr = localStorage.getItem(key);
    const existing: CommunityResource[] = existingStr ? JSON.parse(existingStr) : [];
    // Ensure legacy seeds are removed when saving new state
    const filtered = existing.filter((item) => !item.id.startsWith("res_seed_"));
    const updated = [newResource, ...filtered];
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (error) {
    console.error("Error saving resource to localStorage:", error);
  }

  return newResource;
}

export async function deleteCommunityResource(communityId: string, resourceId: string): Promise<boolean> {
  try {
    const key = `${STORAGE_PREFIX}${communityId}`;
    const existingStr = localStorage.getItem(key);
    if (!existingStr) return true;
    const existing: CommunityResource[] = JSON.parse(existingStr);
    const updated = existing.filter((r) => r.id !== resourceId && !r.id.startsWith("res_seed_"));
    localStorage.setItem(key, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error("Error deleting resource:", error);
    return false;
  }
}

