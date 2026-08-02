import { useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface InviteLinkButtonProps {
  slug: string;
  name: string;
  variant?: "outline" | "secondary" | "ghost";
}

/**
 * Copies a link to the group.
 *
 * The one thing Discord does better than anything else is that a server spreads
 * by someone pasting a link into a chat that already exists. Nobody browses a
 * directory looking for groups to join; they get sent one by a friend.
 *
 * This site had the link all along — /communities/:slug is public and readable —
 * but no way to get at it other than selecting the address bar, which on a phone
 * is enough friction to stop the sharing happening at all. That is the whole
 * feature: put the URL one tap away, and say what will happen to whoever opens
 * it, since "open" and "invite only" behave very differently at the far end.
 */
export function InviteLinkButton({ slug, name, variant = "outline" }: InviteLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const share = async () => {
    const url = `${window.location.origin}/communities/${slug}`;

    // The native sheet on a phone is the whole point — it opens WhatsApp and
    // the group chats people are actually in. Desktop browsers mostly do not
    // have it, hence the clipboard fallback rather than a choice between them.
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch {
        // Dismissing the share sheet rejects. That is a decision, not a
        // failure, so fall through to the clipboard rather than complaining.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied", {
        description: "Paste it wherever the people you want are already talking.",
      });
    } catch {
      toast.error("Could not copy the link", {
        description: url,
      });
    }
  };

  return (
    <Button variant={variant} onClick={share}>
      {copied ? (
        <Check className="mr-2 h-4 w-4 text-green-600 dark:text-green-500" />
      ) : (
        <Link2 className="mr-2 h-4 w-4" />
      )}
      {copied ? "Copied" : "Invite people"}
    </Button>
  );
}

export default InviteLinkButton;
