import { MessageSquare } from "lucide-react";
import { LinkPreviewCard } from "@/components/common/LinkPreviewCard";

interface PostEmbedLinkPreviewProps {
  url: string;
}

/**
 * Replaces a pasted `/community-posts` link with a preview card for the post.
 */
export function PostEmbedLinkPreview({ url }: PostEmbedLinkPreviewProps) {
  // Check if there is a hash or query pointing to a specific post
  let destination = "/posts";
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    destination = parsed.pathname + parsed.search + parsed.hash;
  } catch {
    destination = "/posts";
  }

  return (
    <LinkPreviewCard
      to={destination}
      icon={MessageSquare}
      title="Community post"
      description="A post shared from the Friendly Learning discussion board."
      action="View post"
    />
  );
}

export default PostEmbedLinkPreview;
