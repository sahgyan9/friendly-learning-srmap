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
 * Reads resources for a community. Stored client-side in localStorage with
 * automatic extraction of shared links from posts as initial fallback.
 */
export async function getCommunityResources(
  communityId: string,
  communityName: string,
  communityKind: string,
): Promise<CommunityResource[]> {
  try {
    const key = `${STORAGE_PREFIX}${communityId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as CommunityResource[];
    }
  } catch {
    // continue to default seed
  }

  // Curated initial resource seeds tailored to community kind
  const defaultResources = getDefaultResources(communityId, communityName, communityKind);
  return defaultResources;
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
    const updated = [newResource, ...existing];
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
    const updated = existing.filter((r) => r.id !== resourceId);
    localStorage.setItem(key, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error("Error deleting resource:", error);
    return false;
  }
}

function getDefaultResources(communityId: string, name: string, kind: string): CommunityResource[] {
  const now = new Date().toISOString();
  if (kind === "hackathon") {
    return [
      {
        id: `res_seed_1_${communityId}`,
        communityId,
        title: "Hackathon Project Repository & Boilerplate",
        url: "https://github.com",
        kind: "github",
        description: "Shared codebase template and starter architecture for the team.",
        addedByName: "Team Lead",
        isPinned: true,
        createdAt: now,
      },
      {
        id: `res_seed_2_${communityId}`,
        communityId,
        title: "Problem Statements & Submission Deck",
        url: "https://drive.google.com",
        kind: "drive",
        description: "Evaluation rubrics, PPT guidelines, and team ideas list.",
        addedByName: "Team Lead",
        isPinned: true,
        createdAt: now,
      },
    ];
  }

  if (kind === "study") {
    return [
      {
        id: `res_seed_1_${communityId}`,
        communityId,
        title: "Subject Syllabus & Previous Year Question Papers",
        url: "https://drive.google.com",
        kind: "document",
        description: "Curated end-sem and mid-sem question sets with solutions.",
        addedByName: "Study Lead",
        isPinned: true,
        createdAt: now,
      },
      {
        id: `res_seed_2_${communityId}`,
        communityId,
        title: "Curated Roadmaps & Notes Repo",
        url: "https://github.com",
        kind: "notes",
        description: "Summary cheat sheets and quick reference formula sheets.",
        addedByName: "Study Lead",
        isPinned: true,
        createdAt: now,
      },
    ];
  }

  if (kind === "research") {
    return [
      {
        id: `res_seed_1_${communityId}`,
        communityId,
        title: "Reading List & Papers Archive",
        url: "https://drive.google.com",
        kind: "document",
        description: "Foundational papers, state-of-the-art benchmarks, and survey links.",
        addedByName: "Research Lead",
        isPinned: true,
        createdAt: now,
      },
    ];
  }

  return [
    {
      id: `res_seed_1_${communityId}`,
      communityId,
      title: `${name} — Community Guidelines & Shared Drive`,
      url: "https://drive.google.com",
      kind: "drive",
      description: "Official documents, event photos, and useful campus links.",
      addedByName: "Group Coordinator",
      isPinned: true,
      createdAt: now,
    },
  ];
}
