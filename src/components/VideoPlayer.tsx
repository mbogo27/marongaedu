"use client";

import { useEffect, useRef, useState } from "react";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function VideoPlayer({
  src,
  captionUrl,
  title,
  initialPositionSeconds = 0,
  onProgress,
  onEnded,
}: {
  src: string;
  captionUrl?: string;
  title: string;
  initialPositionSeconds?: number;
  onProgress?: (seconds: number) => void;
  onEnded?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = videoRef.current;
    if (el && initialPositionSeconds > 0) {
      el.currentTime = initialPositionSeconds;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    let lastReported = 0;
    const onTimeUpdate = () => {
      setProgress(el.currentTime);
      if (onProgress && el.currentTime - lastReported > 5) {
        lastReported = el.currentTime;
        onProgress(Math.floor(el.currentTime));
      }
    };
    const onLoadedMeta = () => setDuration(el.duration || 0);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", onLoadedMeta);
    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", onLoadedMeta);
    };
  }, [onProgress]);

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  function setPlaybackRate(rate: number) {
    setSpeed(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  }

  function toggleCaptions() {
    const el = videoRef.current;
    if (!el) return;
    const track = el.textTracks[0];
    if (track) {
      track.mode = captionsOn ? "hidden" : "showing";
    }
    setCaptionsOn(!captionsOn);
  }

  function toggleFullscreen() {
    const el = videoRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen?.();
    }
  }

  async function togglePip() {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await el.requestPictureInPicture?.();
      }
    } catch {
      // PiP unsupported in this browser — ignore
    }
  }

  function seek(seconds: number) {
    if (videoRef.current) videoRef.current.currentTime = seconds;
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-teal-950 shadow-lg">
      <div className="relative aspect-video w-full">
        <video
          ref={videoRef}
          src={src}
          className="h-full w-full"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            onEnded?.();
          }}
          onClick={togglePlay}
        >
          {captionUrl && <track kind="captions" src={captionUrl} srcLang="en" label="English" default={false} />}
        </video>
      </div>
      <div className="flex flex-wrap items-center gap-3 bg-teal-900 px-4 py-3 text-teal-50">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-500 text-teal-900 transition hover:bg-gold-400"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 fill-current">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <input
          type="range"
          min={0}
          max={duration || 0}
          value={progress}
          onChange={(e) => seek(Number(e.target.value))}
          className="h-1.5 flex-1 min-w-[80px] accent-gold-500"
          aria-label="Seek"
        />

        <span className="whitespace-nowrap text-xs text-teal-100/70">
          {formatTime(progress)} / {formatTime(duration)}
        </span>

        <select
          value={speed}
          onChange={(e) => setPlaybackRate(Number(e.target.value))}
          className="rounded-md border border-teal-700 bg-teal-900 px-2 py-1 text-xs"
          aria-label="Playback speed"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>

        {captionUrl && (
          <button
            type="button"
            onClick={toggleCaptions}
            className={`rounded-md border px-2 py-1 text-xs transition ${
              captionsOn ? "border-gold-400 text-gold-300" : "border-teal-700 text-teal-100/70 hover:text-teal-50"
            }`}
          >
            CC
          </button>
        )}

        <button
          type="button"
          onClick={togglePip}
          aria-label="Picture in picture"
          className="rounded-md border border-teal-700 px-2 py-1 text-xs text-teal-100/70 hover:text-teal-50"
        >
          PiP
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label="Fullscreen"
          className="rounded-md border border-teal-700 px-2 py-1 text-xs text-teal-100/70 hover:text-teal-50"
        >
          ⛶
        </button>
      </div>
      <p className="sr-only">{title}</p>
    </div>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
