"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hideCommentAction, postCommentAction } from "@/lib/actions/learn";
import { FormMessage, inputClass, primaryButtonClass } from "@/components/ui/Field";

export type CommentNode = {
  id: string;
  body: string;
  author: string;
  isInstructor: boolean;
  createdAt: string;
  replies: CommentNode[];
};

function Composer({ lessonId, parentId, onDone, label }: { lessonId: string; parentId?: string; onDone?: () => void; label: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await postCommentAction(lessonId, text, parentId);
          if (!res.ok) return setError(res.error);
          setText("");
          setError(null);
          onDone?.();
          router.refresh();
        });
      }}
    >
      <label className="sr-only" htmlFor={`c-${parentId ?? "new"}`}>
        {label}
      </label>
      <textarea id={`c-${parentId ?? "new"}`} value={text} onChange={(e) => setText(e.target.value)} rows={parentId ? 2 : 3} maxLength={2000} placeholder={label} className={inputClass} />
      <FormMessage error={error ?? undefined} />
      <button type="submit" disabled={pending || text.trim().length < 2} className={primaryButtonClass}>
        {pending ? "Posting…" : parentId ? "Reply" : "Post question"}
      </button>
    </form>
  );
}

function Comment({ node, lessonId, isAdmin }: { node: CommentNode; lessonId: string; isAdmin: boolean }) {
  const router = useRouter();
  const [replying, setReplying] = useState(false);
  return (
    <li className="rounded-xl border border-teal-100 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-ink">{node.author}</span>
        {node.isInstructor && <span className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-semibold text-gold-900">Instructor</span>}
        <time className="text-xs text-ink/70" dateTime={node.createdAt}>
          {new Date(node.createdAt).toLocaleDateString("en-KE", { dateStyle: "medium" })}
        </time>
        {isAdmin && (
          <button
            type="button"
            className="ml-auto text-xs text-ink/70 hover:text-red-700"
            onClick={async () => {
              await hideCommentAction(node.id);
              router.refresh();
            }}
          >
            Hide
          </button>
        )}
      </div>
      <p className="mt-2 whitespace-pre-line text-sm text-ink/80">{node.body}</p>
      <button type="button" onClick={() => setReplying((v) => !v)} aria-expanded={replying} className="mt-2 text-xs font-medium text-teal-800 underline underline-offset-2">
        {replying ? "Cancel" : "Reply"}
      </button>
      {replying && (
        <div className="mt-2">
          <Composer lessonId={lessonId} parentId={node.id} label="Write a reply" onDone={() => setReplying(false)} />
        </div>
      )}
      {node.replies.length > 0 && (
        <ul className="mt-3 space-y-3 border-l-2 border-teal-100 pl-4">
          {node.replies.map((r) => (
            <Comment key={r.id} node={r} lessonId={lessonId} isAdmin={isAdmin} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Per-lesson Q&A, rendered only when FEATURE_DISCUSSIONS is on (spec §5.3). */
export default function Discussion({ lessonId, comments, isAdmin }: { lessonId: string; comments: CommentNode[]; isAdmin: boolean }) {
  return (
    <section aria-labelledby="disc-h" className="rounded-2xl border border-teal-100 bg-teal-50/30 p-5">
      <h2 id="disc-h" className="font-serif text-lg text-teal-900">
        Questions &amp; discussion
      </h2>
      <div className="mt-3">
        <Composer lessonId={lessonId} label="Ask a question or share a thought" />
      </div>
      {comments.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {comments.map((c) => (
            <Comment key={c.id} node={c} lessonId={lessonId} isAdmin={isAdmin} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink/70">No questions yet.</p>
      )}
    </section>
  );
}
