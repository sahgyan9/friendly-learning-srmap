import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CommunityLinkPreview } from "@/components/common/CommunityLinkPreview";

// Matches http(s):// and bare www. links. Trailing punctuation (sentence
// periods, closing parens picked up from prose, etc.) is stripped separately
// so "check example.com." doesn't turn the sentence's full stop into part of
// the URL.
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<]+/gi;

function withProtocol(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}

function hostnameOf(url: string) {
  try {
    return new URL(withProtocol(url)).hostname;
  } catch {
    return url;
  }
}

/**
 * A pasted invite link (see InviteLinkButton) is `origin/communities/:slug`.
 * Only same-origin matches count — a link that merely *looks* like one
 * (`evil.example/communities/real-slug`) must not borrow a real group's Join
 * button while its visible href points somewhere else entirely.
 */
function communitySlugFromUrl(url: string): string | null {
  try {
    const parsed = new URL(withProtocol(url));
    if (parsed.hostname !== window.location.hostname) return null;

    const match = parsed.pathname.match(/^\/communities\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/** Peels trailing punctuation off a matched URL, keeping a closing `)` if it balances one inside the URL. */
function splitTrailingPunctuation(raw: string): [url: string, trailing: string] {
  const match = raw.match(/[.,;:!?'")\]]+$/);
  if (!match) return [raw, ""];

  let trailing = match[0];
  let url = raw.slice(0, raw.length - trailing.length);

  while (trailing.startsWith(")")) {
    const opens = (url.match(/\(/g) || []).length;
    const closes = (url.match(/\)/g) || []).length;
    if (opens <= closes) break;
    url += ")";
    trailing = trailing.slice(1);
  }

  return [url, trailing];
}

function renderWithLinks(text: string, onLinkClick: (url: string) => void) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(URL_REGEX)) {
    const start = match.index ?? 0;
    const [url, trailing] = splitTrailingPunctuation(match[0]);
    if (!url) continue;

    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));

    const communitySlug = communitySlugFromUrl(url);

    nodes.push(
      communitySlug ? (
        <CommunityLinkPreview key={key++} slug={communitySlug} label={url} />
      ) : (
        <a
          key={key++}
          href={withProtocol(url)}
          className="text-blue-600 underline decoration-blue-600/40 underline-offset-2 hover:decoration-blue-600 dark:text-blue-400"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onLinkClick(withProtocol(url));
          }}
        >
          {url}
        </a>
      ),
    );

    if (trailing) nodes.push(trailing);
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return nodes;
}

interface LinkifiedTextProps {
  text: string;
  className?: string;
}

/**
 * Renders plain text with any URLs turned into clickable links. Clicking a
 * link stops the click from bubbling (posts/comments often sit inside a
 * clickable card) and asks for confirmation before leaving the site, since
 * the link comes from another user, not from Mentor.
 */
export function LinkifiedText({ text, className }: LinkifiedTextProps) {
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  return (
    <>
      <span className={className}>{renderWithLinks(text, setPendingUrl)}</span>

      <AlertDialog open={pendingUrl !== null} onOpenChange={(open) => !open && setPendingUrl(null)}>
        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Leaving Mentor</AlertDialogTitle>
            <AlertDialogDescription>
              This link was posted by another user and goes to{" "}
              <span className="font-medium text-foreground">{pendingUrl ? hostnameOf(pendingUrl) : ""}</span>.
              Mentor can't vouch for what's there — continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(event) => event.stopPropagation()}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.stopPropagation();
                if (pendingUrl) window.open(pendingUrl, "_blank", "noopener,noreferrer");
                setPendingUrl(null);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
