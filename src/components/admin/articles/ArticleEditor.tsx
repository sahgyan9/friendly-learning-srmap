import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";

interface ArticleEditorProps {
  content: string;
  onChange: (html: string, text: string) => void;
}

const ArticleEditor = ({ content, onChange }: ArticleEditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[240px] px-3 py-2 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getText());
    },
  });

  if (!editor) {
    return null;
  }

  const toolbarButtons = [
    {
      label: "Bold",
      icon: Bold,
      active: editor.isActive("bold"),
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: Italic,
      active: editor.isActive("italic"),
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Heading 2",
      icon: Heading2,
      active: editor.isActive("heading", { level: 2 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Heading 3",
      icon: Heading3,
      active: editor.isActive("heading", { level: 3 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "Bullet list",
      icon: List,
      active: editor.isActive("bulletList"),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      icon: ListOrdered,
      active: editor.isActive("orderedList"),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Quote",
      icon: Quote,
      active: editor.isActive("blockquote"),
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
    },
  ];

  return (
    <div className="rounded-md border border-input bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b border-input p-1">
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
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default ArticleEditor;
