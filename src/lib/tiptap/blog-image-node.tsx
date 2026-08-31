import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";

import { cn } from "@/lib/utils";

export type BlogImageAlign = "left" | "center" | "full";

/**
 * A captioned, aligned image block — deliberately NOT the base Tiptap Image
 * extension extended. That node's own attrs (title/width/height) and
 * renderHTML don't fit a figure/figcaption shape, so overriding all of it
 * anyway made a fully custom Node cleaner than fighting Image.extend().
 *
 * renderHTML emits plain semantic <figure>/<figcaption> markup rather than
 * anything Tiptap-specific, so the stored content_html renders correctly on
 * BlogPostDetail.tsx via plain dangerouslySetInnerHTML with no Tiptap
 * re-mount involved — the same contract knowledge_articles' content_html
 * already relies on.
 */
function BlogImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const { src, alt, align, caption } = node.attrs as {
    src: string;
    alt: string;
    align: BlogImageAlign;
    caption: string;
  };

  return (
    <NodeViewWrapper
      data-align={align}
      className={cn(
        "blog-figure group relative my-4",
        align === "left" && "float-left mr-4 w-1/2 max-w-[420px]",
        align === "center" && "mx-auto max-w-full",
        align === "full" && "w-full clear-both",
        selected && "outline outline-2 outline-primary outline-offset-2 rounded-lg",
      )}
    >
      <img src={src} alt={alt ?? ""} draggable={false} className="w-full rounded-lg" />
      <input
        value={caption}
        onChange={(e) => updateAttributes({ caption: e.target.value })}
        placeholder="Add a caption (optional)"
        className="mt-1.5 w-full bg-transparent text-center text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/60"
      />
    </NodeViewWrapper>
  );
}

export const BlogImage = Node.create({
  name: "blogImage",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
      align: { default: "center" as BlogImageAlign },
      caption: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-blog-image]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const img = el.querySelector("img");
          if (!img) return false;
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt") ?? "",
            align: el.getAttribute("data-align") ?? "center",
            caption: el.querySelector("figcaption")?.textContent ?? "",
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { src, alt, align, caption } = node.attrs as {
      src: string;
      alt: string;
      align: BlogImageAlign;
      caption: string;
    };
    const children: unknown[] = [["img", mergeAttributes({ src, alt: alt || "" })]];
    if (caption) children.push(["figcaption", {}, caption]);
    return [
      "figure",
      { "data-blog-image": "", "data-align": align, class: `blog-figure blog-figure-${align}` },
      ...children,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any;
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlogImageView);
  },
});
