import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { useRef, useState } from "react";
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

interface BlogPostEditorProps {
  content: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
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

export const BlogPostEditor = ({
  content,
  onChange,
  placeholder = "Write your story freely...",
}: BlogPostEditorProps) => {
  const [mathDialog, setMathDialog] = useState<MathDialogState>(EMPTY_MATH_DIALOG);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: { autolink: true, openOnClick: false },
      }),
      Underline,
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
      editor.chain().focus().setHeading({ level: Number(value) as 1 | 2 | 3 | 4 }).run();
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
      {/* Sticky Word/Notion-Style Glassy Toolbar */}
      <div className="sticky top-16 z-30 mb-6 flex flex-wrap items-center gap-1 rounded-xl border border-border/70 bg-background/90 backdrop-blur-md px-2.5 py-1.5 shadow-sm transition-all">
        {/* Heading Dropdown */}
        <Select value={headingValue} onValueChange={(v) => handleHeadingChange(v as HeadingValue)}>
          <SelectTrigger className="h-8 w-[125px] text-xs font-medium border-border/50 bg-background/50">
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

        <div className="mx-1 h-5 w-px bg-border/60" />

        {/* Text Formatting */}
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
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
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
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
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
