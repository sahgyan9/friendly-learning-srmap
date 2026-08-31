import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { Highlight } from "@tiptap/extension-highlight";
import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  ImagePlus,
  Sigma,
  AlignLeft,
  AlignCenter,
  AlignVerticalJustifyCenter,
  Loader2,
  Minus,
  Undo2,
  Redo2,
  RemoveFormatting,
  Code2,
  Highlighter,
  Type,
  Baseline,
} from "lucide-react";
import { toast } from "sonner";
import "katex/dist/katex.min.css";

import { Button } from "@/components/ui/button";
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

export const FONT_FAMILIES = [
  { label: "Default Sans", value: "Inter, system-ui, sans-serif" },
  { label: "Editorial Serif", value: "Merriweather, Georgia, serif" },
  { label: "Code Mono", value: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
  { label: "Modern Outfit", value: "Outfit, Poppins, sans-serif" },
  { label: "Playful Hand", value: "Caveat, cursive, sans-serif" },
];

export const COLOR_SWATCHES = [
  { label: "Default", value: "inherit", bg: "bg-foreground" },
  { label: "Emerald", value: "#10b981", bg: "bg-emerald-500" },
  { label: "Blue", value: "#3b82f6", bg: "bg-blue-500" },
  { label: "Indigo", value: "#6366f1", bg: "bg-indigo-500" },
  { label: "Purple", value: "#a855f7", bg: "bg-purple-500" },
  { label: "Rose", value: "#f43f5e", bg: "bg-rose-500" },
  { label: "Amber", value: "#f59e0b", bg: "bg-amber-500" },
  { label: "Slate", value: "#64748b", bg: "bg-slate-500" },
];

export const HIGHLIGHT_SWATCHES = [
  { label: "None", value: "none", bg: "border border-border bg-transparent" },
  { label: "Yellow", value: "#fef08a", bg: "bg-yellow-200 dark:bg-yellow-500/50" },
  { label: "Green", value: "#bbf7d0", bg: "bg-green-200 dark:bg-green-500/50" },
  { label: "Blue", value: "#bfdbfe", bg: "bg-blue-200 dark:bg-blue-500/50" },
  { label: "Pink", value: "#fbcfe8", bg: "bg-pink-200 dark:bg-pink-500/50" },
  { label: "Orange", value: "#fed7aa", bg: "bg-orange-200 dark:bg-orange-500/50" },
];

export const BlogPostEditor = ({
  content,
  onChange,
  placeholder = "Write your story freely...",
  focusMode = false,
  topOffset,
}: BlogPostEditorProps) => {
  const [mathDialog, setMathDialog] = useState<MathDialogState>(EMPTY_MATH_DIALOG);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [customColor, setCustomColor] = useState("#10b981");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
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
      Placeholder.configure({ placeholder }),
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
        class:
          "prose prose-base sm:prose-lg dark:prose-invert max-w-none min-h-[480px] px-1 py-4 focus:outline-none focus:ring-0 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed prose-blockquote:border-l-4 prose-blockquote:border-primary/60 prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-pre:bg-muted/80 prose-pre:border prose-pre:border-border",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getText());
    },
  });

  // Reactive Sync: Ensure editor content always matches external state changes (e.g. draft restore)
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

  const currentFontFamily = editor.getAttributes("textStyle").fontFamily || "Inter, system-ui, sans-serif";
  const currentColor = editor.getAttributes("textStyle").color;
  const currentHighlight = editor.getAttributes("highlight").color;

  const handleFontFamilyChange = (font: string) => {
    if (font === "Inter, system-ui, sans-serif") {
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
      toast.error(getErrorMessage(error, "Failed to upload image"));
    } finally {
      setUploadingImage(false);
    }
  };

  const setImageAlign = (align: "left" | "center" | "full") => {
    editor.chain().focus().updateAttributes("blogImage", { align }).run();
  };

  const isImageSelected = editor.isActive("blogImage");

  return (
    <div className="w-full relative">
      {/* ========================================================================= */}
      {/* Floating Selection Bubble Menu (Appears directly when highlighting text) */}
      {/* ========================================================================= */}
      <BubbleMenu
        editor={editor}
        updateDelay={50}
        shouldShow={({ editor, from, to }) => {
          return from !== to && !editor.isActive("blogImage") && !editor.isActive("mathBlock");
        }}
      >
        <div className="flex flex-wrap items-center gap-0.5 sm:gap-1 rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-md px-2 py-1.5 shadow-2xl animate-in fade-in-0 zoom-in-95 max-w-[95vw]">
          {/* Heading / Style Selector */}
          <Select value={headingValue} onValueChange={(v) => handleHeadingChange(v as HeadingValue)}>
            <SelectTrigger className="h-7 w-[100px] text-xs font-medium border-border/50 bg-background/70 px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraph" className="text-xs">
                Paragraph
              </SelectItem>
              <SelectItem value="1" className="text-xs font-bold">
                Heading 1
              </SelectItem>
              <SelectItem value="2" className="text-xs font-semibold">
                Heading 2
              </SelectItem>
              <SelectItem value="3" className="text-xs font-medium">
                Heading 3
              </SelectItem>
              <SelectItem value="4" className="text-xs">
                Heading 4
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Font Family Dropdown */}
          <Select value={currentFontFamily} onValueChange={handleFontFamilyChange}>
            <SelectTrigger className="h-7 w-[110px] text-xs font-medium border-border/50 bg-background/70 px-2">
              <Type className="h-3 w-3 mr-1 text-muted-foreground shrink-0" />
              <span className="truncate">
                {FONT_FAMILIES.find((f) => f.value === currentFontFamily)?.label || "Sans"}
              </span>
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((font) => (
                <SelectItem key={font.value} value={font.value} className="text-xs" style={{ fontFamily: font.value }}>
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="mx-0.5 h-4 w-px bg-border/60" />

          {/* Core Formatting (B, I, U, S) */}
          <Button
            type="button"
            variant={editor.isActive("bold") ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant={editor.isActive("italic") ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant={editor.isActive("underline") ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant={editor.isActive("strike") ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </Button>

          <div className="mx-0.5 h-4 w-px bg-border/60" />

          {/* Text Color Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant={currentColor ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7 relative"
                title="Text Color"
              >
                <Baseline className="h-3.5 w-3.5" />
                <span
                  className="absolute bottom-1 left-1.5 right-1.5 h-0.5 rounded-full"
                  style={{ backgroundColor: currentColor || "currentColor" }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 z-50 shadow-xl" align="center" side="top">
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Text Color</span>
                  {currentColor && (
                    <button
                      type="button"
                      onClick={() => handleColorChange("inherit")}
                      className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {COLOR_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.value}
                      type="button"
                      onClick={() => handleColorChange(swatch.value)}
                      className={`flex items-center gap-1.5 p-1.5 rounded-lg text-xs hover:bg-muted transition-colors ${
                        (currentColor === swatch.value || (!currentColor && swatch.value === "inherit"))
                          ? "ring-2 ring-primary ring-offset-1 bg-muted"
                          : ""
                      }`}
                    >
                      <span className={`h-3.5 w-3.5 rounded-full shrink-0 ${swatch.bg}`} />
                      <span className="truncate text-[11px]">{swatch.label}</span>
                    </button>
                  ))}
                </div>
                <div className="pt-2 border-t flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">Custom Color:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        handleColorChange(e.target.value);
                      }}
                      className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">{customColor}</span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Highlight Color Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant={currentHighlight ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7 relative"
                title="Highlight Color"
              >
                <Highlighter className="h-3.5 w-3.5" />
                {currentHighlight && (
                  <span
                    className="absolute bottom-1 left-1.5 right-1.5 h-0.5 rounded-full"
                    style={{ backgroundColor: currentHighlight }}
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 z-50 shadow-xl" align="center" side="top">
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Highlight Marker</span>
                  {currentHighlight && (
                    <button
                      type="button"
                      onClick={() => handleHighlightChange("none")}
                      className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {HIGHLIGHT_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.value}
                      type="button"
                      onClick={() => handleHighlightChange(swatch.value)}
                      className={`flex items-center gap-1.5 p-1.5 rounded-lg text-xs hover:bg-muted transition-colors ${
                        (currentHighlight === swatch.value || (!currentHighlight && swatch.value === "none"))
                          ? "ring-2 ring-primary ring-offset-1 bg-muted"
                          : ""
                      }`}
                    >
                      <span className={`h-3.5 w-3.5 rounded-full shrink-0 ${swatch.bg}`} />
                      <span className="truncate text-[11px]">{swatch.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="mx-0.5 h-4 w-px bg-border/60" />

          {/* Inline Code */}
          <Button
            type="button"
            variant={editor.isActive("code") ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline Code"
          >
            <Code className="h-3.5 w-3.5" />
          </Button>

          {/* Quote Block */}
          <Button
            type="button"
            variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={handleToggleBlockquote}
            title="Quote Block"
          >
            <Quote className="h-3.5 w-3.5" />
          </Button>

          {/* Clear Formatting */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            title="Clear Formatting"
          >
            <RemoveFormatting className="h-3.5 w-3.5" />
          </Button>
        </div>
      </BubbleMenu>

      {/* ========================================================================= */}
      {/* Sticky Top Document Toolbar */}
      {/* ========================================================================= */}
      <div
        className={cn(
          "sticky z-30 mb-6 flex flex-wrap items-center gap-1 rounded-xl border border-border/70 bg-background/95 backdrop-blur-md px-2.5 py-1.5 shadow-sm transition-all",
          topOffset || (focusMode ? "top-14" : "top-[120px]")
        )}
      >
        {/* Heading Dropdown */}
        <Select value={headingValue} onValueChange={(v) => handleHeadingChange(v as HeadingValue)}>
          <SelectTrigger className="h-8 w-[120px] text-xs font-medium border-border/50 bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paragraph" className="text-xs">
              Paragraph
            </SelectItem>
            <SelectItem value="1" className="text-xs font-bold text-base">
              Heading 1
            </SelectItem>
            <SelectItem value="2" className="text-xs font-semibold">
              Heading 2
            </SelectItem>
            <SelectItem value="3" className="text-xs font-medium">
              Heading 3
            </SelectItem>
            <SelectItem value="4" className="text-xs">
              Heading 4
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Font Family Dropdown */}
        <Select value={currentFontFamily} onValueChange={handleFontFamilyChange}>
          <SelectTrigger className="h-8 w-[125px] text-xs font-medium border-border/50 bg-background/50">
            <Type className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
            <span className="truncate">
              {FONT_FAMILIES.find((f) => f.value === currentFontFamily)?.label || "Default Sans"}
            </span>
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((font) => (
              <SelectItem key={font.value} value={font.value} className="text-xs" style={{ fontFamily: font.value }}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="mx-1 h-5 w-px bg-border/60" />

        {/* Text Formatting (B, I, U, S) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("bold") ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Bold (Ctrl+B)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("italic") ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Italic (Ctrl+I)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("underline") ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Underline (Ctrl+U)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("strike") ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Strikethrough</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("code") ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleCode().run()}
            >
              <Code className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Inline Code</TooltipContent>
        </Tooltip>

        <div className="mx-1 h-5 w-px bg-border/60" />

        {/* Text Color Picker Popover */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant={currentColor ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8 relative"
                >
                  <Baseline className="h-4 w-4" />
                  <span
                    className="absolute bottom-1 left-2 right-2 h-0.5 rounded-full"
                    style={{ backgroundColor: currentColor || "currentColor" }}
                  />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">Text Color</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-64 p-3 z-50 shadow-xl" align="start" side="bottom">
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Text Color</span>
                {currentColor && (
                  <button
                    type="button"
                    onClick={() => handleColorChange("inherit")}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.value}
                    type="button"
                    onClick={() => handleColorChange(swatch.value)}
                    className={`flex items-center gap-1.5 p-1.5 rounded-lg text-xs hover:bg-muted transition-colors ${
                      (currentColor === swatch.value || (!currentColor && swatch.value === "inherit"))
                        ? "ring-2 ring-primary ring-offset-1 bg-muted"
                        : ""
                    }`}
                  >
                    <span className={`h-3.5 w-3.5 rounded-full shrink-0 ${swatch.bg}`} />
                    <span className="truncate text-[11px]">{swatch.label}</span>
                  </button>
                ))}
              </div>
              <div className="pt-2 border-t flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">Custom Color:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      handleColorChange(e.target.value);
                    }}
                    className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">{customColor}</span>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Text Highlight Picker Popover */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant={currentHighlight ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8 relative"
                >
                  <Highlighter className="h-4 w-4" />
                  {currentHighlight && (
                    <span
                      className="absolute bottom-1 left-2 right-2 h-0.5 rounded-full"
                      style={{ backgroundColor: currentHighlight }}
                    />
                  )}
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">Highlight Marker</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-56 p-3 z-50 shadow-xl" align="start" side="bottom">
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Highlight Color</span>
                {currentHighlight && (
                  <button
                    type="button"
                    onClick={() => handleHighlightChange("none")}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {HIGHLIGHT_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.value}
                    type="button"
                    onClick={() => handleHighlightChange(swatch.value)}
                    className={`flex items-center gap-1.5 p-1.5 rounded-lg text-xs hover:bg-muted transition-colors ${
                      (currentHighlight === swatch.value || (!currentHighlight && swatch.value === "none"))
                        ? "ring-2 ring-primary ring-offset-1 bg-muted"
                        : ""
                    }`}
                  >
                    <span className={`h-3.5 w-3.5 rounded-full shrink-0 ${swatch.bg}`} />
                    <span className="truncate text-[11px]">{swatch.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <div className="mx-1 h-5 w-px bg-border/60" />

        {/* Lists & Blocks */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Bullet List</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Numbered List</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={handleToggleBlockquote}
            >
              <Quote className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Quote Block</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("codeBlock") ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={handleToggleCodeBlock}
            >
              <Code2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Code Block</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Horizontal Divider</TooltipContent>
        </Tooltip>

        <div className="mx-1 h-5 w-px bg-border/60" />

        {/* Media & Math */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
            >
              {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Insert Image</TooltipContent>
        </Tooltip>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary"
              onClick={() => setMathDialog({ open: true, mode: "insert", initialLatex: "", initialDisplayMode: false })}
            >
              <Sigma className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Insert Math Equation (LaTeX)</TooltipContent>
        </Tooltip>

        {/* Image alignment controls if image is selected */}
        {isImageSelected && (
          <>
            <div className="mx-1 h-5 w-px bg-border/60" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImageAlign("left")}>
                  <AlignLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Align Left</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImageAlign("center")}>
                  <AlignCenter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Center</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImageAlign("full")}>
                  <AlignVerticalJustifyCenter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Full Width</TooltipContent>
            </Tooltip>
          </>
        )}

        <div className="ml-auto flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
              >
                <RemoveFormatting className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Clear Formatting</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!editor.can().undo()}
                onClick={() => editor.chain().focus().undo().run()}
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!editor.can().redo()}
                onClick={() => editor.chain().focus().redo().run()}
              >
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Redo (Ctrl+Y)</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="min-h-[450px] cursor-text">
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

