"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export type VideoCaption = { label: string; lang: string; src: string };

export type VideoPlayerHandle = {
  seekTo: (seconds: number, play?: boolean) => void;
  getTime: () => number;
};

type Props = {
  src: string;
  captions?: VideoCaption[];
  title: string;
  posterUrl?: string;
  initialPositionSeconds?: number;
  /** Called at most every `progressEverySeconds` of playback, and on pause / hide. */
  onProgress?: (seconds: number) => void;
  progressEverySeconds?: number;
  onEnded?: () => void;
  onPlay?: () => void;
  /** Called when playback fails (e.g. an expired signed URL); return a fresh src to retry. */
  onSrcError?: () => Promise<string | null>;
};

/**
 * HTML5 video with a custom control bar: play/pause, scrub, volume, speed
 * (0.75–2x), captions, picture-in-picture, fullscreen and keyboard shortcuts
 * (space/k play, j/l ∓10s, ←/→ ∓5s, ↑/↓ volume, m mute, c captions, f fullscreen,
 * </> speed). Resumes from `initialPositionSeconds`.
 */
const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(function VideoPlayer(
  { src, captions = [], title, posterUrl, initialPositionSeconds = 0, onProgress, progressEverySeconds = 10, onEnded, onPlay, onSrcError },
  ref
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastReported = useRef(0);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const resumeAt = useRef(initialPositionSeconds);
  const retried = useRef(false);

  useEffect(() => {
    setCurrentSrc(src);
    resumeAt.current = initialPositionSeconds;
    retried.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // The browser may have loaded metadata before React attached onLoadedMetadata (server-rendered <video>).
  useEffect(() => {
    const el = videoRef.current;
    if (el && el.readyState >= 1) {
      setDuration(el.duration || 0);
      if (resumeAt.current > 0 && resumeAt.current < (el.duration || Infinity) - 2 && el.currentTime < 1) el.currentTime = resumeAt.current;
    }
  }, []);

  useImperativeHandle(ref, () => ({
    seekTo: (seconds, play = true) => {
      const el = videoRef.current;
      if (!el) return;
      el.currentTime = seconds;
      if (play) void el.play();
    },
    getTime: () => videoRef.current?.currentTime ?? 0,
  }));

  const report = useCallback(
    (force = false) => {
      const el = videoRef.current;
      if (!el || !onProgress) return;
      if (force || Math.abs(el.currentTime - lastReported.current) >= progressEverySeconds) {
        lastReported.current = el.currentTime;
        onProgress(Math.floor(el.currentTime));
      }
    },
    [onProgress, progressEverySeconds]
  );

  // Save position when the tab is hidden / page is left (debounced by the guard in report()).
  useEffect(() => {
    const flush = () => document.visibilityState === "hidden" && report(true);
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush as EventListener);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush as EventListener);
    };
  }, [report]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }, []);

  const toggleCaptions = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    const next = !captionsOn;
    for (const track of Array.from(el.textTracks)) track.mode = next && track === el.textTracks[0] ? "showing" : "hidden";
    setCaptionsOn(next);
  }, [captionsOn]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrapRef.current?.requestFullscreen?.();
  }, []);

  const togglePip = useCallback(async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await el.requestPictureInPicture?.();
    } catch {
      /* PiP unsupported */
    }
  }, []);

  const skip = (delta: number) => {
    const el = videoRef.current;
    if (el) el.currentTime = Math.max(0, Math.min(el.duration || Infinity, el.currentTime + delta));
  };

  const changeSpeed = (rate: number) => {
    setSpeed(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  };

  function onKeyDown(e: React.KeyboardEvent) {
    // Don't hijack keys while the user operates a form control inside the player.
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "SELECT" || (tag === "INPUT" && (e.target as HTMLInputElement).type !== "range")) return;
    const el = videoRef.current;
    if (!el) return;
    switch (e.key) {
      case " ":
        if (tag === "BUTTON") return; // let a focused button handle its own activation
        togglePlay();
        break;
      case "k":
        togglePlay();
        break;
      case "j":
        skip(-10);
        break;
      case "l":
        skip(10);
        break;
      case "ArrowLeft":
        if (tag === "INPUT") return;
        skip(-5);
        break;
      case "ArrowRight":
        if (tag === "INPUT") return;
        skip(5);
        break;
      case "ArrowUp":
        el.volume = Math.min(1, el.volume + 0.1);
        break;
      case "ArrowDown":
        el.volume = Math.max(0, el.volume - 0.1);
        break;
      case "m":
        el.muted = !el.muted;
        break;
      case "c":
        toggleCaptions();
        break;
      case "f":
        toggleFullscreen();
        break;
      case ">":
        changeSpeed(SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.indexOf(speed) + 1)]);
        break;
      case "<":
        changeSpeed(SPEEDS[Math.max(0, SPEEDS.indexOf(speed) - 1)]);
        break;
      default:
        return;
    }
    e.preventDefault();
  }

  async function handleError() {
    // Signed URLs expire (default 1h): fetch a fresh one once and resume where we were.
    if (retried.current || !onSrcError) return;
    retried.current = true;
    resumeAt.current = videoRef.current?.currentTime ?? resumeAt.current;
    const fresh = await onSrcError();
    if (fresh) setCurrentSrc(fresh);
  }

  const btn =
    "rounded-md border border-teal-700 px-2 py-1 text-xs text-teal-100 hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-gold-400";

  return (
    <div
      ref={wrapRef}
      role="group"
      aria-label={`${title} video player`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="overflow-hidden rounded-2xl bg-teal-950 shadow-lg focus-visible:outline-2 focus-visible:outline-gold-400"
    >
      <div className="relative aspect-video w-full">
        <video
          ref={videoRef}
          src={currentSrc}
          poster={posterUrl}
          preload="metadata"
          playsInline
          className="h-full w-full"
          onClick={togglePlay}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            setDuration(el.duration || 0);
            if (resumeAt.current > 0 && resumeAt.current < (el.duration || Infinity) - 2) el.currentTime = resumeAt.current;
            el.playbackRate = speed;
          }}
          onTimeUpdate={(e) => {
            setTime(e.currentTarget.currentTime);
            if (!e.currentTarget.paused) report();
          }}
          onPlay={() => {
            setPlaying(true);
            onPlay?.();
          }}
          onPause={() => {
            setPlaying(false);
            report(true);
          }}
          onEnded={() => {
            setPlaying(false);
            report(true);
            onEnded?.();
          }}
          onVolumeChange={(e) => {
            setVolume(e.currentTarget.volume);
            setMuted(e.currentTarget.muted);
          }}
          onError={handleError}
        >
          {captions.map((c, i) => (
            <track key={c.src} kind="captions" src={c.src} srcLang={c.lang} label={c.label} default={false} data-i={i} />
          ))}
        </video>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-teal-900 px-3 py-2.5 text-teal-50 sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500 text-teal-900 hover:bg-gold-400 focus-visible:outline-2 focus-visible:outline-white"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 fill-current" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={1}
          value={Math.min(time, duration || 0)}
          onChange={(e) => {
            if (videoRef.current) videoRef.current.currentTime = Number(e.target.value);
          }}
          className="h-1.5 min-w-[80px] flex-1 accent-gold-500"
          aria-label="Seek"
          aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
        />

        <span className="whitespace-nowrap text-xs text-teal-100" aria-hidden="true">
          {formatTime(time)} / {formatTime(duration)}
        </span>

        <label className="flex items-center gap-1 text-xs">
          <span className="sr-only">Volume</span>
          <button
            type="button"
            className={btn}
            aria-label={muted ? "Unmute" : "Mute"}
            aria-pressed={muted}
            onClick={() => {
              if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
            }}
          >
            {muted || volume === 0 ? "🔇" : "🔊"}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => {
              if (!videoRef.current) return;
              videoRef.current.muted = false;
              videoRef.current.volume = Number(e.target.value);
            }}
            className="hidden w-16 accent-gold-500 sm:block"
            aria-label="Volume"
          />
        </label>

        <select
          value={speed}
          onChange={(e) => changeSpeed(Number(e.target.value))}
          className="rounded-md border border-teal-700 bg-teal-900 px-2 py-1 text-xs"
          aria-label="Playback speed"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>

        {captions.length > 0 && (
          <button type="button" onClick={toggleCaptions} aria-pressed={captionsOn} aria-label="CC captions" className={`${btn} ${captionsOn ? "border-gold-400 text-gold-300" : ""}`}>
            CC
          </button>
        )}
        <button type="button" onClick={togglePip} aria-label="PiP picture in picture" className={btn}>
          PiP
        </button>
        <button type="button" onClick={toggleFullscreen} aria-label="Fullscreen" className={btn}>
          ⛶
        </button>
      </div>
      <p className="sr-only">Shortcuts: space or k to play, j and l to skip ten seconds, m to mute, c for captions, f for fullscreen.</p>
    </div>
  );
});

export default VideoPlayer;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
