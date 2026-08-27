"use client";

import { useCallback, useRef } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import NotesPanel from "./NotesPanel";
import LessonFooter from "./LessonFooter";
import { updateLessonPositionAction, markLessonCompleteAction } from "@/lib/actions/learn";

type ResourceLink = { label: string; url: string };

export default function VideoLessonPane({
  slug,
  lessonId,
  title,
  videoUrl,
  captionUrl,
  initialPositionSeconds,
  completed,
  prevId,
  nextId,
  noteContent,
  timestampedNotes,
  resources,
}: {
  slug: string;
  lessonId: string;
  title: string;
  videoUrl: string;
  captionUrl?: string;
  initialPositionSeconds: number;
  completed: boolean;
  prevId?: string;
  nextId?: string;
  noteContent: string;
  timestampedNotes: { id: string; content: string; videoTimestampSeconds: number | null; createdAt: string }[];
  resources: ResourceLink[];
}) {
  const timeRef = useRef(initialPositionSeconds);

  const onProgress = useCallback(
    (seconds: number) => {
      timeRef.current = seconds;
      updateLessonPositionAction(slug, lessonId, seconds);
    },
    [slug, lessonId]
  );

  const onEnded = useCallback(() => {
    markLessonCompleteAction(slug, lessonId);
  }, [slug, lessonId]);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-teal-900">{title}</h1>
      <VideoPlayer
        src={videoUrl}
        captionUrl={captionUrl}
        title={title}
        initialPositionSeconds={initialPositionSeconds}
        onProgress={onProgress}
        onEnded={onEnded}
      />
      {resources.length > 0 && (
        <div className="rounded-2xl border border-teal-100 bg-white p-5">
          <h3 className="font-serif text-lg text-teal-900">Resources</h3>
          <ul className="mt-3 space-y-2">
            {resources.map((r) => (
              <li key={r.url}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-teal-700 hover:underline">
                  📎 {r.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <NotesPanel
        lessonId={lessonId}
        initialContent={noteContent}
        timestampedNotes={timestampedNotes}
        getVideoTime={() => timeRef.current}
      />
      <LessonFooter slug={slug} lessonId={lessonId} completed={completed} prevId={prevId} nextId={nextId} />
    </div>
  );
}
