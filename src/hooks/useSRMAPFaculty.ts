import { useCallback, useEffect, useState } from "react";

export interface SRMAPFaculty {
  id: string;
  name: string;
  slug: string;
  profileUrl: string;
  imageUrl: string | null;
  department: string;
}

interface SRMAPPageResponse {
  id: number;
  content?: {
    rendered?: string;
  };
}

const SRMAP_PHYSICS_PAGE_API = "https://www.srmap.edu.in/wp-json/wp/v2/pages?slug=physics";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function normalizeName(value: string): string {
  return value.replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function slugFromProfileUrl(profileUrl: string): string {
  const safeUrl = profileUrl.replace(/\/$/, "");
  const parts = safeUrl.split("/").filter(Boolean);
  return parts[parts.length - 1] || "faculty";
}

function normalizeProfileUrl(href: string): string {
  try {
    return new URL(href, "https://www.srmap.edu.in").toString().replace(/\/$/, "");
  } catch {
    return href.replace(/\/$/, "");
  }
}

function getClosestImage(anchor: Element): string | null {
  let current: Element | null = anchor;

  for (let i = 0; i < 6 && current; i += 1) {
    const img = current.querySelector('img[src*="/wp-content/uploads/"]');
    const src = img?.getAttribute("src");
    if (src) return src;
    current = current.parentElement;
  }

  return null;
}

function parseFacultyFromPhysicsPage(renderedHtml: string): SRMAPFaculty[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(renderedHtml, "text/html");

  const imageByAlt = new Map<string, string>();
  doc.querySelectorAll("img[src]").forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (!src.includes("/wp-content/uploads/")) return;

    const alt = normalizeName(img.getAttribute("alt") || "");
    if (alt) {
      imageByAlt.set(alt, src);
    }
  });

  const facultyMap = new Map<string, SRMAPFaculty>();
  const facultyLinks = Array.from(doc.querySelectorAll('a[href*="/faculty/"]'));

  facultyLinks.forEach((anchor) => {
    const href = anchor.getAttribute("href");
    if (!href) return;

    const profileUrl = normalizeProfileUrl(href);
    const nameText = stripHtml(anchor.textContent || "");
    if (!nameText) return;

    const slug = slugFromProfileUrl(profileUrl);
    if (!slug || facultyMap.has(slug)) return;

    const normalized = normalizeName(nameText);
    const normalizedNoPrefix = normalized.replace(/^(dr|prof)\s+/, "");

    let imageUrl = imageByAlt.get(normalized) || imageByAlt.get(normalizedNoPrefix) || null;

    if (!imageUrl) {
      imageUrl = getClosestImage(anchor);
    }

    facultyMap.set(slug, {
      id: slug,
      name: nameText,
      slug,
      profileUrl,
      imageUrl,
      department: "Physics",
    });
  });

  return Array.from(facultyMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function useSRMAPFaculty(refreshIntervalMs = 5 * 60 * 1000) {
  const [faculty, setFaculty] = useState<SRMAPFaculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFaculty = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(SRMAP_PHYSICS_PAGE_API);
      if (!response.ok) {
        throw new Error("Failed to fetch SRMAP Physics page API");
      }

      const pages = (await response.json()) as SRMAPPageResponse[];
      const renderedHtml = pages[0]?.content?.rendered;
      if (!renderedHtml) {
        throw new Error("Invalid SRMAP Physics page response");
      }

      const parsedFaculty = parseFacultyFromPhysicsPage(renderedHtml);
      setFaculty(parsedFaculty);
    } catch {
      setError("Failed to load SRMAP faculty list. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (cancelled) return;
      await fetchFaculty();
    }

    run();

    const timer = window.setInterval(() => {
      if (!cancelled) {
        void fetchFaculty();
      }
    }, refreshIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [fetchFaculty, refreshIntervalMs]);

  return {
    faculty,
    loading,
    error,
    refetch: fetchFaculty,
  };
}
