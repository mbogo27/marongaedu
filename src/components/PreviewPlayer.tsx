"use client";

import { useState } from "react";
import Image from "next/image";
import LessonVideo from "@/components/LessonVideo";
import type { VideoCaption } from "@/components/VideoPlayer";
import { track } from "@/lib/analytics";

export default function PreviewPlayer({
  source,
  src,
  captions,
  posterUrl,
  title,
  autoPlay = false,
}: {
  source: "file" | "youtube" | "vimeo";
  src: string;
  captions?: VideoCaption[];
  posterUrl: string;
  title: string;
  /** Start in the playing state (used inside the modal, where the user already clicked Preview). */
  autoPlay?: boolean;
}) {
  const [playing, setPlaying] = useState(autoPlay);

  if (playing) {
    return <LessonVideo source={source} src={src} captions={captions} title={title} posterUrl={posterUrl || undefined} />;
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-teal-900 shadow-lg">
      <button
        type="button"
        onClick={() => {
          track("preview_played", { title });
          setPlaying(true);
        }}
        className="group absolute inset-0 flex h-full w-full items-center justify-center focus-visible:outline-2 focus-visible:outline-gold-400"
        aria-label={`Preview · Free. Play preview video for ${title}`}
      >
        {posterUrl && (
          <Image src={posterUrl} alt="" fill sizes="(min-width: 1024px) 720px, 100vw" className="object-cover opacity-80 transition group-hover:opacity-60" />
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-teal-900/80 via-teal-900/20 to-transparent" />
        <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-gold-500 shadow-xl transition group-hover:scale-110">
          <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 fill-teal-900" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        <span className="absolute bottom-4 left-4 z-10 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">Preview · Free</span>
      </button>
    </div>
  );
}
