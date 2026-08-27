// Generates a small, offline, public-domain-safe pool of placeholder lesson
// videos + matching caption tracks with ffmpeg (confirmed installed locally).
// Re-run any time with: node scripts/generate-placeholder-videos.mjs
//
// Lessons/course-preview fields reference these by a stable id
// (e.g. "placeholder-3"); the seed script cycles through the pool.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const videosDir = path.join(root, "public", "videos");
const captionsDir = path.join(root, "public", "captions");

mkdirSync(videosDir, { recursive: true });
mkdirSync(captionsDir, { recursive: true });

const clips = [
  { id: "placeholder-1", color: "0x14555a", title: "Maronga Dental Academy", tone: 220 },
  { id: "placeholder-2", color: "0xb08b2e", title: "Lesson Preview", tone: 246 },
  { id: "placeholder-3", color: "0x1f3a5f", title: "Clinical Demonstration", tone: 261 },
  { id: "placeholder-4", color: "0x0f3d3d", title: "Case Study Walkthrough", tone: 277 },
  { id: "placeholder-5", color: "0x5c1f2e", title: "Step by Step Technique", tone: 293 },
  { id: "placeholder-6", color: "0x146b66", title: "Course Introduction", tone: 311 },
  { id: "placeholder-7", color: "0x8a6a1f", title: "Hands On Walkthrough", tone: 329 },
  { id: "placeholder-8", color: "0x394a5a", title: "Review and Summary", tone: 349 },
  { id: "placeholder-9", color: "0x2e6b5e", title: "Patient Case Discussion", tone: 369 },
  { id: "placeholder-10", color: "0xa67c1e", title: "Practical Tips", tone: 392 },
];

const DURATION = 10;

for (const clip of clips) {
  const outFile = path.join(videosDir, `${clip.id}.mp4`);
  console.log(`Generating ${clip.id}.mp4 ...`);
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-f", "lavfi",
      "-i", `color=c=${clip.color}:s=960x540:d=${DURATION}`,
      "-f", "lavfi",
      "-i", `sine=frequency=${clip.tone}:duration=${DURATION}`,
      "-vf",
      `drawtext=text='${clip.title}':fontcolor=white:fontsize=40:font=Arial:x=(w-text_w)/2:y=(h-text_h)/2,` +
        `drawtext=text='Placeholder video - Maronga Dental Academy':fontcolor=0xffffffaa:fontsize=18:font=Arial:x=(w-text_w)/2:y=h-60`,
      "-af", "volume=0.12",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-shortest",
      outFile,
    ],
    { stdio: "ignore" }
  );

  const vtt = `WEBVTT

00:00:00.000 --> 00:00:03.000
${clip.title} (placeholder captions).

00:00:03.000 --> 00:00:07.000
This is a stand-in clip for the sales demo.

00:00:07.000 --> 00:00:${DURATION}.000
Swap public/videos/${clip.id}.mp4 for real footage before launch.
`;
  writeFileSync(path.join(captionsDir, `${clip.id}.vtt`), vtt, "utf8");
}

console.log(`Done. ${clips.length} placeholder videos + captions generated.`);
