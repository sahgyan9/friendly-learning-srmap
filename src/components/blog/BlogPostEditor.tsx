import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  ImagePlus,
  Sigma,
  AlignLeft,
  AlignCenter,
  AlignVerticalJustifyCenter,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import "katex/dist/katex.min.css";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BlogImage } from "@/lib/tiptap/blog-image-node";
import { MathInline, MathBlock } from "@/lib/tiptap/math-node";
import { uploadBlogPostImage } from "@/integrations/supabase/services/blog-posts";
import { getErrorMessage } from "@/lib/errors";
import { BlogImageCropDialog } from "./BlogImageCropDialog";
import { MathEquationDialog } from "./MathEquationDialog";

interface BlogPostEditorProps {
  content: string;
  onChange: (html: string, text: string) => void;
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

const BlogPostEditor = ({ content, onChange }: BlogPostEditorProps) => {
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
      Placeholder.configure({ placeholder: "Tell your story..." }),
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
          "prose prose-sm sm:prose-base dark:prose-invert max-w-none min-h-[320px] px-3 py-2 focus:outline-none prose-headings:font-semibold",
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

  const toolbarButtons = [
    { label: "Bold", icon: Bold, active: editor.isActive("bold"), onClick: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", icon: Italic, active: editor.isActive("italic"), onClick: () => editor.chain().focus().toggleItalic().run() },
    { label: "Underline", icon: UnderlineIcon, active: editor.isActive("underline"), onClick: () => editor.chain().focus().toggleUnderline().run() },
    { label: "Bullet list", icon: List, active: editor.isActive("bulletList"), onClick: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", icon: ListOrdered, active: editor.isActive("orderedList"), onClick: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Quote", icon: Quote, active: editor.isActive("blockquote"), onClick: () => editor.chain().focus().toggleBlockquote().run() },
  ];

  return (
    <div className="rounded-md border border-input bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b border-input p-1">
        <Select value={headingValue} onValueChange={(v) => handleHeadingChange(v as HeadingValue)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paragraph">Paragraph</SelectItem>
            <SelectItem value="1">Heading 1</SelectItem>
            <SelectItem value="2">Heading 2</SelectItem>
            <SelectItem value="3">Heading 3</SelectItem>
            <SelectItem value="4">Heading 4</SelectItem>
          </SelectContent>
        </Select>

        <div className="mx-1 h-5 w-px bg-border" />

        {toolbarButtons.map(({ label, icon: Icon, active, onClick }) => (
          <Button
            key={label}
            type="button"
            variant={active ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={onClick}
            aria-label={label}
            title={label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}

        <div className="mx-1 h-5 w-px bg-border" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Insert image"
          title="Insert image"
          disabled={uploadingImage}
        >
          {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setMathDialog({ open: true, mode: "insert", initialLatex: "", initialDisplayMode: false })}
          aria-label="Insert equation"
          title="Insert equation"
        >
          <Sigma className="h-4 w-4" />
        </Button>

        {isImageSelected && (
          <>
            <div className="mx-1 h-5 w-px bg-border" />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImageAlign("left")} aria-label="Align image left" title="Align left">
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImageAlign("center")} aria-label="Center image" title="Center">
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImageAlign("full")} aria-label="Full-width image" title="Full width">
              <AlignVerticalJustifyCenter className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <EditorContent editor={editor} />

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
