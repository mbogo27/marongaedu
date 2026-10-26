"use client";

import { useEffect, useRef, useState } from "react";
import { saveNoteAction, deleteNoteAction } from "@/lib/actions/learn";

export type NoteItem = { id: string; content: string; videoTimestampSeconds: number | null; createdAt: string };

export default function NotesPanel({
  lessonId,
  initialContent,
  timestampedNotes,
  getVideoTime,
  onSeek,
  courseNotesHref,
}: {
  lessonId: string;
  initialContent: string;
  timestampedNotes: NoteItem[];
  getVideoTime?: () => number;
  onSeek?: (seconds: number) => void;
  courseNotesHref?: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [notes, setNotes] = useState(timestampedNotes);
  const lastSaved = useRef(initialContent);

  // Debounced autosave (spec §5.3).
  useEffect(() => {
    if (content === lastSaved.current) return;
    const timer = setTimeout(async () => {
      setStatus("saving");
      try {
        await saveNoteAction(lessonId, content);
        lastSaved.current = content;
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [content, lessonId]);

  async function addTimestampNote() {
    const seconds = getVideoTime ? Math.floor(getVideoTime()) : 0;
    const text = `Note at ${formatTime(seconds)}`;
    const id = await saveNoteAction(lessonId, text, seconds);
    if (id) setNotes((prev) => [{ id, content: text, videoTimestampSeconds: seconds, createdAt: new Date().toISOString() }, ...prev]);
  }

  async function updateNote(id: string, text: string) {
    await saveNoteAction(lessonId, text, undefined, id);
  }

  async function removeNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await deleteNoteAction(id);
  }

  return (
    <section aria-labelledby="notes-h" className="rounded-2xl border border-teal-100 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 id="notes-h" className="font-serif text-lg text-teal-900">
          Notes
        </h2>
        <span className="text-xs text-ink/70" role="status" aria-live="polite">
          {status === "saved" ? "Saved" : status === "saving" ? "Saving…" : "Could not save"}
        </span>
      </div>
      <label htmlFor="lesson-note" className="sr-only">
        Notes for this lesson
      </label>
      <textarea
        id="lesson-note"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        maxLength={5000}
        placeholder="Take notes on this lesson…"
        className="mt-3 w-full rounded-xl border border-teal-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
      />
      <div className="mt-2 flex flex-wrap items-center gap-4">
        {getVideoTime && (
          <button type="button" onClick={addTimestampNote} className="text-xs font-semibold text-teal-800 underline underline-offset-2">
            + Add note at current time
          </button>
        )}
        {courseNotesHref && (
          <a href={courseNotesHref} className="text-xs font-medium text-teal-800 underline underline-offset-2">
            All my notes for this course
          </a>
        )}
      </div>
      {notes.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-teal-100 pt-3">
          {notes.map((n) => (
            <li key={n.id} className="flex items-start gap-2 text-sm">
              {n.videoTimestampSeconds != null && (
                <button
                  type="button"
                  onClick={() => onSeek?.(n.videoTimestampSeconds!)}
                  className="shrink-0 rounded bg-teal-50 px-1.5 py-0.5 text-xs font-medium text-teal-900 hover:bg-teal-100"
                  aria-label={`Jump to ${formatTime(n.videoTimestampSeconds)}`}
                >
                  {formatTime(n.videoTimestampSeconds)}
                </button>
              )}
              <input
                defaultValue={n.content}
                aria-label="Note text"
                maxLength={5000}
                onBlur={(e) => e.target.value !== n.content && updateNote(n.id, e.target.value)}
                className="min-w-0 flex-1 rounded border border-transparent px-1 py-0.5 text-ink/80 hover:border-teal-100 focus:border-teal-400 focus:outline-none"
              />
              <button type="button" onClick={() => removeNote(n.id)} className="shrink-0 text-xs text-ink/70 hover:text-red-700">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
