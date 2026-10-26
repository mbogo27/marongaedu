"use client";

import { forwardRef } from "react";
import VideoPlayer, { type VideoCaption, type VideoPlayerHandle } from "@/components/VideoPlayer";

type Props = {
  source: "file" | "youtube" | "vimeo";
  src: string;
  title: string;
  captions?: VideoCaption[];
  posterUrl?: string;
  initialPositionSeconds?: number;
  onProgress?: (seconds: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onSrcError?: () => Promise<string | null>;
};

/** Native player for uploaded files; a sandboxed iframe for YouTube / Vimeo. */
const LessonVideo = forwardRef<VideoPlayerHandle, Props>(function LessonVideo({ source, src, title, ...rest }, ref) {
  if (source !== "file") {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-teal-950 shadow-lg">
        <iframe
          src={src}
          title={title}
          className="absolute inset-0 h-full w-full"
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }
  return <VideoPlayer ref={ref} src={src} title={title} {...rest} />;
});

export default LessonVideo;
