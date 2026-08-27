"use client";

import { useEffect, useRef, useState } from "react";
import { saveNoteAction, deleteNoteAction } from "@/lib/actions/learn";

type Note = { id: string; content: string; videoTimestampSeconds: number | null; createdAt: string };

export default function NotesPanel({
  lessonId,
  initialContent,
  timestampedNotes,
  getVideoTime,
}: {
  lessonId: string;
  initialContent: string;
  timestampedNotes: Note[];
  getVideoTime?: () => number;
}) {
  const [content, setContent] = useState(initialContent);
  const [saved, setSaved] = useState(true);
  const [notes, setNotes] = useState(timestampedNotes);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeout.current) clearTimeout(timeout.current);
    if (content === initialContent) return;
    setSaved(false);
    timeout.current = setTimeout(async () => {
      await saveNoteAction(lessonId, content);
      setSaved(true);
    }, 800);
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  async function addTimestampNote() {
    const seconds = getVideoTime ? Math.floor(getVideoTime()) : 0;
    const text = `Note at ${formatTime(seconds)}`;
    const id = await saveNoteAction(lessonId, text, seconds);
    setNotes((prev) => [{ id, content: text, videoTimestampSeconds: seconds, createdAt: new Date().toISOString() }, ...prev]);
  }

  async function removeNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await deleteNoteAction(id);
  }

  return (
    <div className="rounded-2xl border border-teal-100 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg text-teal-900">Notes</h3>
        <span className="text-xs text-ink/40">{saved ? "Saved" : "Saving…"}</span>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="Take notes on this lesson..."
        className="mt-3 w-full rounded-xl border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
      />
      {getVideoTime && (
        <button
          type="button"
          onClick={addTimestampNote}
          className="mt-2 text-xs font-medium text-gold-600 hover:underline"
        >
          + Add note at current time
        </button>
      )}
      {notes.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-teal-100 pt-3">
          {notes.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-2 text-sm">
              <span className="text-ink/70">
                {n.videoTimestampSeconds != null && (
                  <span className="mr-2 rounded bg-teal-50 px-1.5 py-0.5 text-xs font-medium text-teal-700">
                    {formatTime(n.videoTimestampSeconds)}
                  </span>
                )}
                {n.content}
              </span>
              <button type="button" onClick={() => removeNote(n.id)} className="shrink-0 text-xs text-ink/30 hover:text-red-500">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
