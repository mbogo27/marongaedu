"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import LessonVideo from "@/components/LessonVideo";
import type { VideoPlayerHandle } from "@/components/VideoPlayer";
import NotesPanel, { type NoteItem } from "./NotesPanel";
import LessonFooter from "./LessonFooter";
import AttachmentList from "./AttachmentList";
import { savePositionAction, setLessonCompleteAction, refreshLessonAction } from "@/lib/actions/learn";
import { track } from "@/lib/analytics";
import type { LessonBody } from "@/lib/lesson-access";

type VideoBody = Extract<LessonBody, { kind: "video" }>;

export default function VideoLessonPane({
  slug,
  lessonId,
  title,
  body,
  initialPositionSeconds,
  completed,
  prevId,
  nextId,
  nextLocked,
  noteContent,
  timestampedNotes,
  canTrack,
}: {
  slug: string;
  lessonId: string;
  title: string;
  body: VideoBody;
  initialPositionSeconds: number;
  completed: boolean;
  prevId?: string;
  nextId?: string;
  nextLocked?: boolean;
  noteContent: string;
  timestampedNotes: NoteItem[];
  /** False for admins without an enrollment: they can watch but nothing is recorded. */
  canTrack: boolean;
}) {
  const router = useRouter();
  const player = useRef<VideoPlayerHandle>(null);
  const started = useRef(false);

  const onProgress = useCallback(
    async (seconds: number) => {
      if (!canTrack) return;
      const res = await savePositionAction(lessonId, seconds);
      if (res.ok && res.completed) router.refresh(); // auto-completed at >= 90%
    },
    [lessonId, canTrack, router]
  );

  const onEnded = useCallback(async () => {
    if (!canTrack || completed) return;
    await setLessonCompleteAction(lessonId, true);
    router.refresh();
  }, [lessonId, canTrack, completed, router]);

  const onPlay = useCallback(() => {
    if (!started.current) {
      started.current = true;
      track("lesson_started", { lessonId });
    }
  }, [lessonId]);

  // Signed URLs expire; fetch a fresh one when the browser reports a load error.
  const onSrcError = useCallback(async () => {
    const view = await refreshLessonAction(lessonId);
    return view.ok && view.body.kind === "video" ? view.body.src : null;
  }, [lessonId]);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-teal-900">{title}</h1>
      <LessonVideo
        ref={player}
        source={body.source}
        src={body.src}
        title={title}
        captions={body.captions}
        initialPositionSeconds={initialPositionSeconds}
        onProgress={onProgress}
        onEnded={onEnded}
        onPlay={onPlay}
        onSrcError={onSrcError}
      />
      {body.transcript && (
        <details className="rounded-2xl border border-teal-100 bg-white p-5">
          <summary className="cursor-pointer font-serif text-lg text-teal-900">Transcript</summary>
          <p className="mt-3 whitespace-pre-line text-sm text-ink/80">{body.transcript}</p>
        </details>
      )}
      <AttachmentList items={body.attachments} />
      {canTrack && (
        <NotesPanel
          lessonId={lessonId}
          initialContent={noteContent}
          timestampedNotes={timestampedNotes}
          getVideoTime={body.source === "file" ? () => player.current?.getTime() ?? 0 : undefined}
          onSeek={(s) => player.current?.seekTo(s)}
          courseNotesHref={`/learn/${slug}/notes`}
        />
      )}
      <LessonFooter slug={slug} lessonId={lessonId} completed={completed} prevId={prevId} nextId={nextId} nextLocked={nextLocked} hideMarkComplete={!canTrack} />
    </div>
  );
}
