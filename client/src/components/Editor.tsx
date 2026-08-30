import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

interface Props {
  content: JSONContent;
  editable: boolean;
  onChange: (json: JSONContent) => void;
}

export default function Editor({ content, editable, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      // Tiptap v3's StarterKit already bundles Underline (and several other
      // marks/nodes) -- adding it again triggers a duplicate-extension warning.
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  // Keep the editor's editable state in sync (e.g. read-only fallback).
  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  if (!editor) return null;

  return (
    <div className="editor-wrap">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
}

function Toolbar({ editor }: { editor: NonNullable<ReturnType<typeof useEditor>> }) {
  const btn = (
    active: boolean,
    onClick: () => void,
    label: string,
    title: string
  ) => (
    <button
      type="button"
      className={`toolbar-btn${active ? " active" : ""}`}
      onClick={onClick}
      title={title}
      aria-pressed={active}
    >
      {label}
    </button>
  );

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "B", "Bold (Ctrl+B)")}
      {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "I", "Italic (Ctrl+I)")}
      {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), "U", "Underline (Ctrl+U)")}
      {btn(editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), "S", "Strikethrough")}
      <span className="toolbar-sep" />
      {btn(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), "H1", "Heading 1")}
      {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2", "Heading 2")}
      {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "H3", "Heading 3")}
      <span className="toolbar-sep" />
      {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "•", "Bulleted list")}
      {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "1.", "Numbered list")}
      {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), "❝", "Quote")}
    </div>
  );
}
