import { useEffect } from "react";
import { NOINDEX_HOLD_ATTR } from "@/lib/seo/noindex-hold";

const setMeta = (name: string, content: string) => {
  let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.content = content;
};

/**
 * Marks the current page noindex while it is mounted.
 *
 * Vercel serves index.html with HTTP 200 for any URL it has no prerendered
 * file for, so a deleted faculty slug or a mistyped blog link is a "soft 404"
 * to a search engine: a 200 page that says "not found". Static hosting cannot
 * change that status per request, but Google honours a noindex added after
 * rendering, which keeps these pages out of the index. Render this inside
 * every not-found state. The cleanup restores the default when the state
 * resolves or the user navigates away.
 */
export default function NoIndex() {
  useEffect(() => {
    document.documentElement.setAttribute(NOINDEX_HOLD_ATTR, "");
    setMeta("robots", "noindex, follow");
    setMeta("googlebot", "noindex, follow");
    return () => {
      document.documentElement.removeAttribute(NOINDEX_HOLD_ATTR);
      setMeta("robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
      setMeta("googlebot", "index, follow");
    };
  }, []);
  return null;
}
