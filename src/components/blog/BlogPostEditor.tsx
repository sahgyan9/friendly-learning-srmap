import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { Highlight } from "@tiptap/extension-highlight";
import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  Baseline,
  Bold,
  Code,
  Code2,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Plus,
  Quote,
  Redo2,
  RemoveFormatting,
  Sigma,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
  RectangleHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import "katex/dist/katex.min.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BlogImage } from "@/lib/tiptap/blog-image-node";
import { MathInline, MathBlock } from "@/lib/tiptap/math-node";
import { uploadBlogPostImage } from "@/integrations/supabase/services/blog-posts";
import { getErrorMessage } from "@/lib/errors";
import { BlogImageCropDialog } from "./BlogImageCropDialog";
import { MathEquationDialog } from "./MathEquationDialog";
import { ARTICLE_PROSE } from "./article-prose";
import { cn } from "@/lib/utils";

interface BlogPostEditorProps {
  content: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  focusMode?: boolean;
  topOffset?: string;
}

type HeadingValue = "paragraph" | "1" | "2" | "3" | "4";

interface MathDialogState {
  open: boolean;
  mode: "insert" | "edit";
  initialLatex: string;
  initialDisplayMode: boolean;
  apply?: (next: string) => void;
}

const EMPTY_MATH_DIALOG: MathDialogState = {
  open: false,
  mode: "insert",
  initialLatex: "",
  initialDisplayMode: false,
};

// Values are stored inline in post HTML, so they must never change; only the
// labels shown in the picker are free to edit.
export const FONT_FAMILIES = [
  { label: "Sans", value: "Inter, system-ui, sans-serif" },
  { label: "Serif", value: "Merriweather, Georgia, serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
  { label: "Outfit", value: "Outfit, Poppins, sans-serif" },
  { label: "Handwritten", value: "Caveat, cursive, sans-serif" },
];

export const COLOR_SWATCHES = [
  { label: "Default", value: "inherit", bg: "bg-foreground" },
  { label: "Green", value: "#10b981", bg: "bg-emerald-500" },
  { label: "Blue", value: "#3b82f6", bg: "bg-blue-500" },
  { label: "Indigo", value: "#6366f1", bg: "bg-indigo-500" },
  { label: "Purple", value: "#a855f7", bg: "bg-purple-500" },
  { label: "Red", value: "#f43f5e", bg: "bg-rose-500" },
  { label: "Amber", value: "#f59e0b", bg: "bg-amber-500" },
  { label: "Grey", value: "#64748b", bg: "bg-slate-500" },
];

export const HIGHLIGHT_SWATCHES = [
  { label: "None", value: "none", bg: "border border-border bg-transparent" },
  { label: "Yellow", value: "#fef08a", bg: "bg-yellow-200 dark:bg-yellow-500/50" },
  { label: "Green", value: "#bbf7d0", bg: "bg-green-200 dark:bg-green-500/50" },
  { label: "Blue", value: "#bfdbfe", bg: "bg-blue-200 dark:bg-blue-500/50" },
  { label: "Pink", value: "#fbcfe8", bg: "bg-pink-200 dark:bg-pink-500/50" },
  { label: "Orange", value: "#fed7aa", bg: "bg-orange-200 dark:bg-orange-500/50" },
];

const DEFAULT_FONT = FONT_FAMILIES[0].value;

const IS_MAC =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);

/** Formats a Tiptap-style key combo ("Mod-Shift-8") for the current platform. */
const keys = (combo: string) =>
  combo
    .split("-")
    .map((k) => {
      if (k === "Mod") return IS_MAC ? "⌘" : "Ctrl";
      if (k === "Alt") return IS_MAC ? "⌥" : "Alt";
      if (k === "Shift") return IS_MAC ? "⇧" : "Shift";
      return k.toUpperCase();
    })
    .join(IS_MAC ? "" : "+");

/** Adds a scheme to bare domains so "github.com/x" doesn't become a relative link. */
const normaliseHref = (raw: string) => {
  const value = raw.trim();
  if (!value) return "";
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(value)) return value;
  return `https://${value}`;
};

// Prevents toolbar clicks from stealing focus out of the editor, which would
// collapse the selection the command is meant to act on.
const keepEditorFocus = (e: React.MouseEvent) => e.preventDefault();

const EditorIconButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
>(({ active, className, children, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    aria-pressed={active}
    data-active={active ? "true" : undefined}
    className={cn(
      "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 sm:h-8 sm:w-8",
      "hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
      "data-[active=true]:bg-secondary data-[active=true]:text-foreground",
      className,
    )}
    {...props}
  >
    {children}
  </button>
));
EditorIconButton.displayName = "EditorIconButton";

const TooltipLabel = ({ label, shortcut }: { label: string; shortcut?: string }) => (
  <span className="flex items-center gap-2 text-xs">
    <span>{label}</span>
    {shortcut && (
      <kbd className="rounded border border-border bg-muted px-1 font-sans text-2xs font-medium text-muted-foreground tabular">
        {keys(shortcut)}
      </kbd>
    )}
  </span>
);

interface ToolButtonProps {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  side?: "top" | "bottom";
}

const ToolButton = ({ label, shortcut, active, disabled, onClick, children, side = "bottom" }: ToolButtonProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <EditorIconButton
        aria-label={label}
        active={active}
        disabled={disabled}
        onMouseDown={keepEditorFocus}
        onClick={onClick}
      >
        {children}
      </EditorIconButton>
    </TooltipTrigger>
    <TooltipContent side={side}>
      <TooltipLabel label={label} shortcut={shortcut} />
    </TooltipContent>
  </Tooltip>
);

const Divider = () => <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />;

/** Applies, edits or removes a link on the current selection. */
const applyLink = (editor: Editor, rawHref: string) => {
  const href = normaliseHref(rawHref);
  if (!href) {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  const { empty } = editor.state.selection;
  if (empty && !editor.isActive("link")) {
    // Nothing selected: insert the URL itself as the link text.
    editor
      .chain()
      .focus()
      .insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] })
      .run();
    return;
  }
  editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
};

interface LinkFormProps {
  initial: string;
  hasLink: boolean;
  onApply: (href: string) => void;
  onRemove: () => void;
  onCancel: () => void;
}

const LinkForm = ({ initial, hasLink, onApply, onRemove, onCancel }: LinkFormProps) => {
  const [value, setValue] = useState(initial);
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onApply(value);
      }}
    >
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        placeholder="Paste or type a link"
        aria-label="Link URL"
        className="h-8 min-w-0 flex-1 text-sm"
      />
      <Button type="submit" size="sm" className="h-8 px-3" disabled={!value.trim()}>
        Apply
      </Button>
      {hasLink && (
        <Tooltip>
          <TooltipTrigger asChild>
            <EditorIconButton aria-label="Remove link" onClick={onRemove}>
              <Unlink className="h-4 w-4" />
            </EditorIconButton>
          </TooltipTrigger>
          <TooltipContent side="top">
            <TooltipLabel label="Remove link" />
          </TooltipContent>
        </Tooltip>
      )}
    </form>
  );
};

export const BlogPostEditor = ({
  content,
  onChange,
  placeholder = "Tell your story…",
  focusMode = false,
  topOffset,
}: BlogPostEditorProps) => {
  const [mathDialog, setMathDialog] = useState<MathDialogState>(EMPTY_MATH_DIALOG);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [customColor, setCustomColor] = useState("#10b981");
  const [toolbarLinkOpen, setToolbarLinkOpen] = useState(false);
  const [bubbleLinkOpen, setBubbleLinkOpen] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    // Toolbar active states (bold, heading level, undo availability) are read
    // during render, so the component must re-render on selection changes,
    // not only when the document changes.
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: { autolink: true, openOnClick: false },
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder: ({ editor: ed, node }) => {
          if (node.type.name === "heading") return `Heading ${node.attrs.level}`;
          return ed.isEmpty ? placeholder : "";
        },
      }),
      BlogImage,
      MathInline.configure({
        onRequestEdit: (latex, displayMode, apply) =>
          setMathDialog({ open: true, mode: "edit", initialLatex: latex, initialDisplayMode: displayMode, apply }),
      }),
      MathBlock.configure({
        onRequestEdit: (latex, displayMode, apply) =>
          setMathDialog({ open: true, mode: "edit", initialLatex: latex, initialDisplayMode: displayMode, apply }),
      }),
    ],
    content,
    editorProps: {
      attributes: {
        "aria-label": "Post body",
        class: cn(
          ARTICLE_PROSE,
          "min-h-[420px] pb-24 focus:outline-none",
          // Placeholder text comes from the Placeholder extension's
          // data-placeholder attribute; it needs a pseudo-element to show.
          "[&_.is-empty]:before:pointer-events-none [&_.is-empty]:before:float-left [&_.is-empty]:before:h-0 [&_.is-empty]:before:text-muted-foreground/60 [&_.is-empty]:before:content-[attr(data-placeholder)]",
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getText());
    },
  });

  // Keep the editor in step with external content changes (draft restore,
  // loading an existing post) without clobbering what the author is typing.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const currentHtml = editor.getHTML();
    if (content !== undefined && content !== currentHtml) {
      const isEditorEmpty = editor.isEmpty || currentHtml === "<p></p>" || currentHtml === "";
      if (isEditorEmpty || !editor.isFocused) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    }
  }, [editor, content]);

  if (!editor) {
    return null;
  }

  const headingValue: HeadingValue = editor.isActive("heading", { level: 1 })
    ? "1"
    : editor.isActive("heading", { level: 2 })
    ? "2"
    : editor.isActive("heading", { level: 3 })
    ? "3"
    : editor.isActive("heading", { level: 4 })
    ? "4"
    : "paragraph";

  const handleHeadingChange = (value: HeadingValue) => {
    if (value === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else {
      const level = Number(value) as 1 | 2 | 3 | 4;
      if (editor.isActive("listItem")) {
        editor.chain().focus().liftListItem("listItem").setHeading({ level }).run();
      } else {
        editor.chain().focus().setHeading({ level }).run();
      }
    }
  };

  const handleToggleBlockquote = () => {
    if (editor.isActive("blockquote")) {
      editor.chain().focus().toggleBlockquote().run();
      return;
    }

    if (editor.isActive("listItem")) {
      editor.chain().focus().liftListItem("listItem").toggleBlockquote().run();
      return;
    }

    if (editor.isActive("codeBlock")) {
      editor.chain().focus().clearNodes().toggleBlockquote().run();
      return;
    }

    editor.chain().focus().toggleBlockquote().run();
  };

  const handleToggleCodeBlock = () => {
    if (editor.isActive("codeBlock")) {
      editor.chain().focus().toggleCodeBlock().run();
      return;
    }

    if (editor.isActive("listItem")) {
      editor.chain().focus().liftListItem("listItem").toggleCodeBlock().run();
      return;
    }

    editor.chain().focus().toggleCodeBlock().run();
  };

  const currentFontFamily = editor.getAttributes("textStyle").fontFamily || DEFAULT_FONT;
  const currentColor = editor.getAttributes("textStyle").color;
  const currentHighlight = editor.getAttributes("highlight").color;
  const currentHref: string = editor.getAttributes("link").href ?? "";
  const isLinkActive = editor.isActive("link");

  const handleFontFamilyChange = (font: string) => {
    if (font === DEFAULT_FONT) {
      editor.chain().focus().unsetFontFamily().run();
    } else {
      editor.chain().focus().setFontFamily(font).run();
    }
  };

  const handleColorChange = (color: string) => {
    if (color === "inherit") {
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().setColor(color).run();
    }
  };

  const handleHighlightChange = (color: string) => {
    if (color === "none") {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().toggleHighlight({ color }).run();
    }
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) setPendingImageFile(file);
  };

  const handleCropped = async (cropped: File) => {
    setUploadingImage(true);
    try {
      const { url } = await uploadBlogPostImage(cropped);
      editor.chain().focus().insertContent({ type: "blogImage", attrs: { src: url, align: "center", caption: "" } }).run();
      setPendingImageFile(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't upload the image. Try again."));
    } finally {
      setUploadingImage(false);
    }
  };

  const setImageAlign = (align: "left" | "center" | "full") => {
    editor.chain().focus().updateAttributes("blogImage", { align }).run();
  };

  const imageAlign = editor.getAttributes("blogImage").align as "left" | "center" | "full" | undefined;

  const openMathInsert = () =>
    setMathDialog({ open: true, mode: "insert", initialLatex: "", initialDisplayMode: false });

  const requestImage = () => fileInputRef.current?.click();

  // One list drives both the "+" line menu and keeps labels identical to the toolbar.
  const insertActions = [
    { label: "Heading", icon: Heading2, shortcut: "Mod-Alt-2", run: () => editor.chain().focus().setHeading({ level: 2 }).run() },
    { label: "Subheading", icon: Heading3, shortcut: "Mod-Alt-3", run: () => editor.chain().focus().setHeading({ level: 3 }).run() },
    { label: "Bulleted list", icon: List, shortcut: "Mod-Shift-8", run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", icon: ListOrdered, shortcut: "Mod-Shift-7", run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Quote", icon: Quote, shortcut: "Mod-Shift-B", run: handleToggleBlockquote },
    { label: "Code block", icon: Code2, shortcut: "Mod-Alt-C", run: handleToggleCodeBlock },
    { label: "Image", icon: ImagePlus, run: requestImage },
    { label: "Equation", icon: Sigma, run: openMathInsert },
    { label: "Divider", icon: Minus, run: () => editor.chain().focus().setHorizontalRule().run() },
  ];

  return (
    <div className="relative w-full">
      {/* Selection menu: inline marks only, so it stays small enough to sit
          over a single line of text without covering what was selected. */}
      <BubbleMenu
        editor={editor}
        updateDelay={50}
        shouldShow={({ editor: ed, from, to }) =>
          from !== to && !ed.isActive("blogImage") && !ed.isActive("mathBlock") && !ed.isActive("codeBlock")
        }
        options={{ onHide: () => setBubbleLinkOpen(false) }}
      >
        <div
          role="toolbar"
          aria-label="Text formatting"
          className="flex max-w-[calc(100vw-2rem)] items-center gap-0.5 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-float animate-scale-in"
        >
          {bubbleLinkOpen ? (
            <div className="w-72 max-w-full">
              <LinkForm
                initial={currentHref}
                hasLink={isLinkActive}
                onApply={(href) => {
                  applyLink(editor, href);
                  setBubbleLinkOpen(false);
                }}
                onRemove={() => {
                  applyLink(editor, "");
                  setBubbleLinkOpen(false);
                }}
                onCancel={() => {
                  setBubbleLinkOpen(false);
                  editor.commands.focus();
                }}
              />
            </div>
          ) : (
            <>
              <ToolButton side="top" label="Bold" shortcut="Mod-B" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
                <Bold className="h-4 w-4" />
              </ToolButton>
              <ToolButton side="top" label="Italic" shortcut="Mod-I" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
                <Italic className="h-4 w-4" />
              </ToolButton>
              <ToolButton side="top" label="Underline" shortcut="Mod-U" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                <UnderlineIcon className="h-4 w-4" />
              </ToolButton>
              <ToolButton side="top" label="Strikethrough" shortcut="Mod-Shift-S" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
                <Strikethrough className="h-4 w-4" />
              </ToolButton>
              <ToolButton side="top" label="Inline code" shortcut="Mod-E" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
                <Code className="h-4 w-4" />
              </ToolButton>
              <Divider />
              <ToolButton side="top" label={isLinkActive ? "Edit link" : "Add link"} active={isLinkActive} onClick={() => setBubbleLinkOpen(true)}>
                <Link2 className="h-4 w-4" />
              </ToolButton>
              <ToolButton
                side="top"
                label="Highlight"
                shortcut="Mod-Shift-H"
                active={editor.isActive("highlight")}
                onClick={() =>
                  editor.isActive("highlight")
                    ? editor.chain().focus().unsetHighlight().run()
                    : editor.chain().focus().toggleHighlight({ color: HIGHLIGHT_SWATCHES[1].value }).run()
                }
              >
                <Highlighter className="h-4 w-4" />
              </ToolButton>
              <ToolButton side="top" label="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().run()}>
                <RemoveFormatting className="h-4 w-4" />
              </ToolButton>
            </>
          )}
        </div>
      </BubbleMenu>

      {/* Image menu: alignment lives next to the image it changes. */}
      <BubbleMenu
        editor={editor}
        pluginKey="blogImageMenu"
        updateDelay={50}
        shouldShow={({ editor: ed }) => ed.isActive("blogImage")}
      >
        <div
          role="toolbar"
          aria-label="Image layout"
          className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-float animate-scale-in"
        >
          <ToolButton side="top" label="Float left" active={imageAlign === "left"} onClick={() => setImageAlign("left")}>
            <AlignLeft className="h-4 w-4" />
          </ToolButton>
          <ToolButton side="top" label="Centre" active={imageAlign === "center"} onClick={() => setImageAlign("center")}>
            <AlignCenter className="h-4 w-4" />
          </ToolButton>
          <ToolButton side="top" label="Full width" active={imageAlign === "full"} onClick={() => setImageAlign("full")}>
            <RectangleHorizontal className="h-4 w-4" />
          </ToolButton>
        </div>
      </BubbleMenu>

      {/* Insert menu on empty lines. Options render beside the "+" over the
          empty line itself, so the menu's anchor size never changes. It needs
          the left gutter, so below md the sticky toolbar covers inserts. */}
      <FloatingMenu
        editor={editor}
        options={{ placement: "left", offset: 12, flip: true, shift: { padding: 8 }, onHide: () => setInsertOpen(false) }}
      >
        <div className="relative hidden md:block">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={insertOpen ? "Close insert menu" : "Insert block"}
                aria-expanded={insertOpen}
                onMouseDown={keepEditorFocus}
                onClick={() => setInsertOpen((open) => !open)}
                className={cn(
                  "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors duration-150 hover:border-foreground/30 hover:text-foreground",
                  insertOpen && "border-foreground/30 text-foreground",
                )}
              >
                {insertOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
            </TooltipTrigger>
            {!insertOpen && (
              <TooltipContent side="top">
                <TooltipLabel label="Insert heading, list, image, code or equation" />
              </TooltipContent>
            )}
          </Tooltip>

          {insertOpen && (
            <div
              role="toolbar"
              aria-label="Insert block"
              className="absolute left-full top-1/2 ml-2 flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-float animate-scale-in"
            >
              {insertActions.map(({ label, icon: Icon, shortcut, run }) => (
                <ToolButton
                  key={label}
                  side="top"
                  label={label}
                  shortcut={shortcut}
                  onClick={() => {
                    setInsertOpen(false);
                    run();
                  }}
                >
                  <Icon className="h-4 w-4" />
                </ToolButton>
              ))}
            </div>
          )}
        </div>
      </FloatingMenu>

      {/* Document toolbar. Grouped by what each control affects: block style,
          inline style, structure, inserts, then history on the far right. */}
      <div
        role="toolbar"
        aria-label="Formatting"
        className={cn(
          "sticky z-30 -mx-1 mb-6 flex items-center gap-0.5 overflow-x-auto border-b border-border bg-background px-1 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          topOffset || (focusMode ? "top-14" : "top-[120px]"),
        )}
      >
        <Select value={headingValue} onValueChange={(v) => handleHeadingChange(v as HeadingValue)}>
          <SelectTrigger
            aria-label="Text style"
            className="h-9 w-[116px] shrink-0 border-0 bg-transparent px-2 text-sm shadow-none hover:bg-accent focus:ring-0 focus:ring-offset-0 sm:h-8"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paragraph">Paragraph</SelectItem>
            <SelectItem value="1" className="text-base font-semibold">Heading 1</SelectItem>
            <SelectItem value="2" className="font-semibold">Heading 2</SelectItem>
            <SelectItem value="3" className="font-medium">Heading 3</SelectItem>
            <SelectItem value="4">Heading 4</SelectItem>
          </SelectContent>
        </Select>

        <Select value={currentFontFamily} onValueChange={handleFontFamilyChange}>
          <SelectTrigger
            aria-label="Font"
            className="h-9 w-[112px] shrink-0 border-0 bg-transparent px-2 text-sm shadow-none hover:bg-accent focus:ring-0 focus:ring-offset-0 sm:h-8"
          >
            <span className="truncate">
              {FONT_FAMILIES.find((f) => f.value === currentFontFamily)?.label || "Sans"}
            </span>
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((font) => (
              <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Divider />

        <ToolButton label="Bold" shortcut="Mod-B" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Italic" shortcut="Mod-I" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Underline" shortcut="Mod-U" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Strikethrough" shortcut="Mod-Shift-S" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </ToolButton>

        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <EditorIconButton aria-label="Text colour" active={Boolean(currentColor)} className="relative">
                  <Baseline className="h-4 w-4" />
                  <span
                    aria-hidden
                    className="absolute bottom-1.5 left-2.5 right-2.5 h-0.5 rounded-full"
                    style={{ backgroundColor: currentColor || "currentColor" }}
                  />
                </EditorIconButton>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <TooltipLabel label="Text colour" />
            </TooltipContent>
          </Tooltip>
          <PopoverContent className="w-60 p-3" align="start" side="bottom">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                <span>Text colour</span>
                {currentColor && (
                  <button
                    type="button"
                    onClick={() => handleColorChange("inherit")}
                    className="cursor-pointer text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {COLOR_SWATCHES.map((swatch) => {
                  const selected = currentColor === swatch.value || (!currentColor && swatch.value === "inherit");
                  return (
                    <button
                      key={swatch.value}
                      type="button"
                      aria-label={swatch.label}
                      aria-pressed={selected}
                      title={swatch.label}
                      onClick={() => handleColorChange(swatch.value)}
                      className={cn(
                        "flex h-9 cursor-pointer items-center justify-center rounded-md border transition-colors duration-150 hover:bg-accent",
                        selected ? "border-foreground/40 bg-accent" : "border-transparent",
                      )}
                    >
                      <span className={cn("h-4 w-4 rounded-full", swatch.bg)} />
                    </button>
                  );
                })}
              </div>
              <label className="flex items-center justify-between gap-2 border-t border-border pt-2.5 text-xs text-muted-foreground">
                <span>Custom</span>
                <span className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      handleColorChange(e.target.value);
                    }}
                    className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <span className="font-mono uppercase tabular">{customColor}</span>
                </span>
              </label>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <EditorIconButton aria-label="Highlight colour" active={Boolean(currentHighlight)} className="relative">
                  <Highlighter className="h-4 w-4" />
                  {currentHighlight && (
                    <span
                      aria-hidden
                      className="absolute bottom-1.5 left-2.5 right-2.5 h-0.5 rounded-full"
                      style={{ backgroundColor: currentHighlight }}
                    />
                  )}
                </EditorIconButton>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <TooltipLabel label="Highlight" shortcut="Mod-Shift-H" />
            </TooltipContent>
          </Tooltip>
          <PopoverContent className="w-52 p-3" align="start" side="bottom">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                <span>Highlight</span>
                {currentHighlight && (
                  <button
                    type="button"
                    onClick={() => handleHighlightChange("none")}
                    className="cursor-pointer text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {HIGHLIGHT_SWATCHES.map((swatch) => {
                  const selected = currentHighlight === swatch.value || (!currentHighlight && swatch.value === "none");
                  return (
                    <button
                      key={swatch.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => handleHighlightChange(swatch.value)}
                      className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-md border p-1.5 text-xs transition-colors duration-150 hover:bg-accent",
                        selected ? "border-foreground/40 bg-accent" : "border-transparent",
                      )}
                    >
                      <span className={cn("h-3.5 w-3.5 shrink-0 rounded-full", swatch.bg)} />
                      <span className="truncate">{swatch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Divider />

        <ToolButton label="Bulleted list" shortcut="Mod-Shift-8" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Numbered list" shortcut="Mod-Shift-7" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Quote" shortcut="Mod-Shift-B" active={editor.isActive("blockquote")} onClick={handleToggleBlockquote}>
          <Quote className="h-4 w-4" />
        </ToolButton>

        <Divider />

        <Popover
          open={toolbarLinkOpen}
          onOpenChange={(open) => setToolbarLinkOpen(open)}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <EditorIconButton aria-label={isLinkActive ? "Edit link" : "Add link"} active={isLinkActive}>
                  <Link2 className="h-4 w-4" />
                </EditorIconButton>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <TooltipLabel label={isLinkActive ? "Edit link" : "Add link"} />
            </TooltipContent>
          </Tooltip>
          <PopoverContent className="w-80 p-2" align="start" side="bottom">
            {toolbarLinkOpen && (
              <LinkForm
                initial={currentHref}
                hasLink={isLinkActive}
                onApply={(href) => {
                  applyLink(editor, href);
                  setToolbarLinkOpen(false);
                }}
                onRemove={() => {
                  applyLink(editor, "");
                  setToolbarLinkOpen(false);
                }}
                onCancel={() => setToolbarLinkOpen(false)}
              />
            )}
          </PopoverContent>
        </Popover>

        <ToolButton label={uploadingImage ? "Uploading image" : "Image"} disabled={uploadingImage} onClick={requestImage}>
          <ImagePlus className="h-4 w-4" />
        </ToolButton>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />

        <ToolButton label="Code block" shortcut="Mod-Alt-C" active={editor.isActive("codeBlock")} onClick={handleToggleCodeBlock}>
          <Code2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Equation (LaTeX)" onClick={openMathInsert}>
          <Sigma className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </ToolButton>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-2">
          <ToolButton label="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
            <RemoveFormatting className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Undo" shortcut="Mod-Z" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
            <Undo2 className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Redo" shortcut="Mod-Shift-Z" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
            <Redo2 className="h-4 w-4" />
          </ToolButton>
        </div>
      </div>

      {uploadingImage && (
        <p role="status" className="mb-4 text-sm text-muted-foreground">
          Uploading image…
        </p>
      )}

      <div className="cursor-text">
        <EditorContent editor={editor} />
      </div>

      <BlogImageCropDialog
        file={pendingImageFile}
        saving={uploadingImage}
        onCancel={() => setPendingImageFile(null)}
        onCropped={handleCropped}
      />

      <MathEquationDialog
        open={mathDialog.open}
        mode={mathDialog.mode}
        initialLatex={mathDialog.initialLatex}
        initialDisplayMode={mathDialog.initialDisplayMode}
        onCancel={() => setMathDialog(EMPTY_MATH_DIALOG)}
        onConfirm={(latex, displayMode) => {
          if (mathDialog.mode === "edit") {
            mathDialog.apply?.(latex);
          } else {
            editor
              .chain()
              .focus()
              .insertContent({ type: displayMode ? "mathBlock" : "mathInline", attrs: { latex } })
              .run();
          }
          setMathDialog(EMPTY_MATH_DIALOG);
        }}
      />
    </div>
  );
};

export default BlogPostEditor;
