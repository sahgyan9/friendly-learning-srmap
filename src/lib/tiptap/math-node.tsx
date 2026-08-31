import katex from "katex";
import { Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";

import { cn } from "@/lib/utils";

/**
 * KaTeX's rendered HTML is baked into the node's own renderHTML output at
 * serialize time (editor.getHTML()), not left as a bare data-latex
 * attribute that would need KaTeX's JS to render on the reader's page.
 * BlogPostDetail.tsx therefore needs only katex.min.css (for the font-face
 * and layout rules the class names depend on), never the katex JS bundle.
 *
 * renderToString can throw on malformed LaTeX; throwOnError:false instead
 * renders KaTeX's own inline error markup, which is more useful to the
 * author than a blank node or a crashed save.
 */
function renderLatex(latex: string, displayMode: boolean): string {
  if (!latex.trim()) return "";
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode, output: "html" });
  } catch {
    return `<span class="text-destructive text-xs">Invalid equation</span>`;
  }
}

type EditRequestHandler = (latex: string, displayMode: boolean, apply: (next: string) => void) => void;

function MathNodeView(props: NodeViewProps) {
  const { node, editor, getPos, extension } = props;
  const displayMode = node.type.name === "mathBlock";
  const latex = (node.attrs.latex as string) ?? "";
  const html = renderLatex(latex, displayMode);

  const handleDoubleClick = () => {
    const onRequestEdit = extension.options.onRequestEdit as EditRequestHandler | undefined;
    if (!onRequestEdit) return;
    onRequestEdit(latex, displayMode, (next: string) => {
      const pos = typeof getPos === "function" ? getPos() : undefined;
      if (pos === undefined) return;
      editor
        .chain()
        .focus()
        .command(({ tr }) => {
          tr.setNodeMarkup(pos, undefined, { latex: next });
          return true;
        })
        .run();
    });
  };

  return (
    <NodeViewWrapper
      as={displayMode ? "div" : "span"}
      onDoubleClick={handleDoubleClick}
      title="Double-click to edit"
      className={cn(
        "math-node cursor-pointer rounded hover:bg-muted/60",
        displayMode ? "my-3 block px-2 py-1 text-center" : "inline-block px-0.5",
        !latex.trim() && "border border-dashed border-muted-foreground/40 px-2 text-xs text-muted-foreground",
      )}
    >
      {latex.trim() ? (
        <span dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <span>Empty equation — double-click to edit</span>
      )}
    </NodeViewWrapper>
  );
}

/**
 * Real DOM nodes are a valid ProseMirror DOMOutputSpec (not only the array
 * form), which is what lets this hand the whole baked KaTeX tree straight
 * through — there is no way to splice an HTML string into the array spec
 * format, since string children there become escaped text, not markup.
 */
function bakedMathDOM(latex: string, displayMode: boolean): HTMLElement {
  const wrapper = document.createElement(displayMode ? "div" : "span");
  wrapper.className = `math-node math-${displayMode ? "block" : "inline"}`;
  wrapper.setAttribute("data-latex", latex);
  wrapper.innerHTML = renderLatex(latex, displayMode) || "";
  return wrapper;
}

interface MathNodeOptions {
  /** Wired up by BlogPostEditor to open the shared math dialog pre-filled for editing. */
  onRequestEdit?: EditRequestHandler;
}

export const MathInline = Node.create<MathNodeOptions>({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return { onRequestEdit: undefined };
  },

  addAttributes() {
    return { latex: { default: "" } };
  },

  parseHTML() {
    return [
      {
        tag: "span.math-node.math-inline[data-latex]",
        getAttrs: (el) => (el instanceof HTMLElement ? { latex: el.getAttribute("data-latex") ?? "" } : false),
      },
    ];
  },

  renderHTML({ node }) {
    if (typeof document === "undefined") {
      return ["span", { class: "math-node math-inline", "data-latex": node.attrs.latex }, node.attrs.latex];
    }
    return bakedMathDOM(node.attrs.latex as string, false);
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },
});

export const MathBlock = Node.create<MathNodeOptions>({
  name: "mathBlock",
  group: "block",
  atom: true,

  addOptions() {
    return { onRequestEdit: undefined };
  },

  addAttributes() {
    return { latex: { default: "" } };
  },

  parseHTML() {
    return [
      {
        tag: "div.math-node.math-block[data-latex]",
        getAttrs: (el) => (el instanceof HTMLElement ? { latex: el.getAttribute("data-latex") ?? "" } : false),
      },
    ];
  },

  renderHTML({ node }) {
    if (typeof document === "undefined") {
      return ["div", { class: "math-node math-block", "data-latex": node.attrs.latex }, node.attrs.latex];
    }
    return bakedMathDOM(node.attrs.latex as string, true);
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },
});
