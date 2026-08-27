"use client";

import { useState } from "react";
import Image from "next/image";
import VideoPlayer from "./VideoPlayer";

export default function PreviewPlayer({
  src,
  captionUrl,
  posterUrl,
  title,
}: {
  src: string;
  captionUrl?: string;
  posterUrl: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return <VideoPlayer src={src} captionUrl={captionUrl} title={title} />;
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-teal-900 shadow-lg">
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="group absolute inset-0 flex h-full w-full items-center justify-center"
        aria-label={`Play preview video for ${title}`}
      >
        <Image
          src={posterUrl}
          alt=""
          fill
          sizes="(min-width: 1024px) 720px, 100vw"
          className="object-cover opacity-80 transition group-hover:opacity-60"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-teal-900/80 via-teal-900/20 to-transparent" />
        <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-gold-500 shadow-xl transition group-hover:scale-110">
          <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 fill-teal-900">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        <span className="absolute bottom-4 left-4 z-10 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white">
          Preview · Free
        </span>
      </button>
    </div>
  );
}
