"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { requestUploadAction } from "@/lib/actions/admin/courses";

/**
 * TipTap editor for course descriptions, reading lessons and legal pages.
 * Output is plain HTML; the server sanitizes it on save AND on render
 * (src/lib/sanitize.ts), so the editor's permissiveness is not a trust boundary.
 */
export default function RichTextEditor({
  content,
  onChange,
  label = "Rich text",
}: {
  content: string;
  onChange: (html: string) => void;
  label?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false } }), Image],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "aria-label": label,
        role: "textbox",
        "aria-multiline": "true",
        class:
          "max-w-none min-h-[160px] rounded-b-lg px-3 py-2 text-sm focus:outline-none [&_a]:text-teal-800 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-teal-200 [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-teal-50 [&_code]:px-1 [&_h2]:mt-3 [&_h2]:font-serif [&_h2]:text-lg [&_h3]:mt-2 [&_h3]:font-semibold [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_pre]:rounded-lg [&_pre]:bg-teal-950 [&_pre]:p-3 [&_pre]:text-teal-50 [&_ul]:list-disc [&_ul]:pl-5",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return <div className="h-[200px] animate-pulse rounded-lg border border-teal-100 bg-teal-50/50" />;

  async function insertImage(file: File) {
    const req = await requestUploadAction("siteAsset", file.name, file.type, file.size);
    if (!req.ok) {
      window.alert(req.error);
      return;
    }
    const res = await fetch(req.upload.url, { method: "PUT", headers: req.upload.headers, body: file });
    if (!res.ok) {
      window.alert("Image upload failed.");
      return;
    }
    editor?.chain().focus().setImage({ src: req.url, alt: file.name.replace(/\.[^.]+$/, "") }).run();
  }

  return (
    <div className="rounded-lg border border-teal-200 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/30">
      <div role="toolbar" aria-label={`${label} formatting`} className="flex flex-wrap gap-1 border-b border-teal-100 bg-teal-50/50 px-2 py-1.5">
        <Btn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold" text="B" />
        <Btn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic" text="I" />
        <Btn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="Heading 2" text="H2" />
        <Btn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="Heading 3" text="H3" />
        <Btn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Bulleted list" text="• List" />
        <Btn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Numbered list" text="1. List" />
        <Btn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Quote" text="“ ”" />
        <Btn active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} label="Code block" text="</>" />
        <Btn
          active={editor.isActive("link")}
          onClick={() => {
            const url = window.prompt("Link URL (https://…)");
            if (url === null) return;
            if (url === "") editor.chain().focus().unsetLink().run();
            else editor.chain().focus().setLink({ href: url }).run();
          }}
          label="Link"
          text="Link"
        />
        <label className="cursor-pointer rounded px-2 py-1 text-xs font-medium text-ink/80 hover:bg-teal-100 focus-within:outline-2 focus-within:outline-teal-600">
          Image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void insertImage(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function Btn({ active, onClick, label, text }: { active: boolean; onClick: () => void; label: string; text: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`rounded px-2 py-1 text-xs font-medium transition ${active ? "bg-teal-700 text-white" : "text-ink/80 hover:bg-teal-100"}`}
    >
      {text}
    </button>
  );
}
