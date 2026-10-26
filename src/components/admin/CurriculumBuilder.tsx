"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import RichTextEditor from "./RichTextEditor";
import FileUploadField, { probeVideoDuration } from "./FileUploadField";
import { detectVideoSource } from "@/lib/content-types";
import type { LessonPayload, ModulePayload, QuestionPayload } from "@/lib/course-schema";

export type EditableLesson = LessonPayload;
export type EditableModule = ModulePayload;

const newId = () => `c${nanoid(12)}`;

export function newLesson(type: EditableLesson["type"]): EditableLesson {
  return {
    id: newId(),
    title: type === "VIDEO" ? "New video lesson" : type === "READING" ? "New reading" : type === "QUIZ" ? "New quiz" : "New resource",
    type,
    durationSeconds: type === "VIDEO" ? 0 : 300,
    isFreePreview: false,
    videoSource: "file",
    videoKey: "",
    videoUrl: "",
    captions: [],
    transcript: "",
    attachments: [],
    readingHtml: "",
    resource: null,
    resourceDescription: "",
    quizInstructions: "Answer every question. You need 70% to pass.",
    passMark: 70,
    questions: [],
  };
}

export function newModule(index: number): EditableModule {
  return { id: newId(), title: `Module ${index}`, description: "", lessons: [] };
}

const inputCls =
  "w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30";
const chip = "rounded-full border border-teal-300 bg-white px-3 py-1.5 text-xs font-medium text-teal-800 hover:bg-teal-50";

function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
}

type ModulesUpdate = EditableModule[] | ((prev: EditableModule[]) => EditableModule[]);
type ModulePatch = Partial<EditableModule> | ((mod: EditableModule) => Partial<EditableModule>);

export default function CurriculumBuilder({ modules, onChange }: { modules: EditableModule[]; onChange: (next: ModulesUpdate) => void }) {
  const sensors = useDndSensors();

  function handleModuleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onChange(arrayMove(modules, modules.findIndex((m) => m.id === active.id), modules.findIndex((m) => m.id === over.id)));
  }
  // Functional updates: async callbacks (upload finished, duration probed) must not overwrite each other with a stale snapshot.
  const updateModule = (id: string, patch: ModulePatch) =>
    onChange((prev) => prev.map((m) => (m.id === id ? { ...m, ...(typeof patch === "function" ? patch(m) : patch) } : m)));

  function moveLessonToModule(lessonId: string, fromModuleId: string, toModuleId: string) {
    if (fromModuleId === toModuleId) return;
    const lesson = modules.find((m) => m.id === fromModuleId)?.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    onChange(
      modules.map((m) =>
        m.id === fromModuleId ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) } : m.id === toModuleId ? { ...m, lessons: [...m.lessons, lesson] } : m
      )
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg text-teal-900">Curriculum builder</h2>
          <p className="text-sm text-ink/70">Drag the ⠿ handles (or focus one and press Space, then the arrow keys) to reorder modules and lessons.</p>
        </div>
        <button type="button" onClick={() => onChange([...modules, newModule(modules.length + 1)])} className={chip}>
          + Add module
        </button>
      </div>

      {modules.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-teal-300 px-4 py-8 text-center text-sm text-ink/70">
          No modules yet. Add one to start building the curriculum.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
          <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <div className="mt-5 flex flex-col gap-4">
              {modules.map((mod, mi) => (
                <SortableModule
                  key={mod.id}
                  mod={mod}
                  index={mi}
                  allModules={modules}
                  onUpdate={(patch) => updateModule(mod.id, patch)}
                  onRemove={() => {
                    if (mod.lessons.length === 0 || window.confirm(`Remove "${mod.title}" and its ${mod.lessons.length} lesson(s)? Learner progress on them will be lost.`)) {
                      onChange(modules.filter((m) => m.id !== mod.id));
                    }
                  }}
                  onMoveLesson={(lessonId, toModuleId) => moveLessonToModule(lessonId, mod.id, toModuleId)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableModule({
  mod,
  index,
  allModules,
  onUpdate,
  onRemove,
  onMoveLesson,
}: {
  mod: EditableModule;
  index: number;
  allModules: EditableModule[];
  onUpdate: (patch: ModulePatch) => void;
  onRemove: () => void;
  onMoveLesson: (lessonId: string, toModuleId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mod.id });
  const lessonSensors = useDndSensors();
  const [expanded, setExpanded] = useState(true);

  function handleLessonDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onUpdate({
      lessons: arrayMove(mod.lessons, mod.lessons.findIndex((l) => l.id === active.id), mod.lessons.findIndex((l) => l.id === over.id)),
    });
  }
  const updateLesson = (lessonId: string, patch: Partial<EditableLesson>) =>
    onUpdate((m) => ({ lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, ...patch } : l)) }));

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="rounded-xl border border-teal-100 bg-teal-50/40 p-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" {...attributes} {...listeners} className="shrink-0 cursor-grab touch-none rounded px-1 text-ink/70 hover:bg-white" aria-label={`Reorder module ${mod.title}`}>
          ⠿
        </button>
        <span className="shrink-0 text-xs font-medium text-ink/70">#{index + 1}</span>
        <input
          value={mod.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          aria-label={`Module ${index + 1} title`}
          className={`${inputCls} min-w-[10rem] flex-1 font-medium`}
        />
        <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="shrink-0 rounded-lg px-2 py-2 text-xs text-ink/80 hover:bg-white">
          {expanded ? "Collapse" : "Expand"}
        </button>
        <button type="button" onClick={onRemove} className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50">
          Remove module
        </button>
      </div>

      {expanded && (
        <>
          <textarea
            value={mod.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Optional module description"
            aria-label={`Module ${index + 1} description`}
            rows={2}
            className={`${inputCls} mt-3`}
          />

          <DndContext sensors={lessonSensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd}>
            <SortableContext items={mod.lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              <ul className="mt-3 flex flex-col gap-3 sm:pl-4">
                {mod.lessons.map((lesson, li) => (
                  <SortableLesson
                    key={lesson.id}
                    lesson={lesson}
                    index={li}
                    moduleId={mod.id}
                    otherModules={allModules.filter((m) => m.id !== mod.id)}
                    onUpdate={(patch) => updateLesson(lesson.id, patch)}
                    onRemove={() => {
                      if (window.confirm(`Remove lesson "${lesson.title}"? Learner progress on it will be lost.`)) {
                        onUpdate((m) => ({ lessons: m.lessons.filter((l) => l.id !== lesson.id) }));
                      }
                    }}
                    onMoveToModule={(toId) => onMoveLesson(lesson.id, toId)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          <div className="mt-3 flex flex-wrap gap-2 sm:pl-4">
            {(["VIDEO", "READING", "QUIZ", "RESOURCE"] as const).map((type) => (
              <button key={type} type="button" onClick={() => onUpdate((m) => ({ lessons: [...m.lessons, newLesson(type)] }))} className={chip}>
                + {type === "VIDEO" ? "Video lesson" : type === "READING" ? "Reading lesson" : type === "QUIZ" ? "Quiz" : "Resource"}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SortableLesson({
  lesson,
  index,
  moduleId,
  otherModules,
  onUpdate,
  onRemove,
  onMoveToModule,
}: {
  lesson: EditableLesson;
  index: number;
  moduleId: string;
  otherModules: EditableModule[];
  onUpdate: (patch: Partial<EditableLesson>) => void;
  onRemove: () => void;
  onMoveToModule: (toModuleId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id });
  const [open, setOpen] = useState(false);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="rounded-lg border border-teal-100 bg-white p-3"
      data-module={moduleId}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" {...attributes} {...listeners} className="shrink-0 cursor-grab touch-none rounded px-1 text-ink/70 hover:bg-teal-50" aria-label={`Reorder lesson ${lesson.title}`}>
          ⠿
        </button>
        <span className="shrink-0 text-xs text-ink/70">{index + 1}.</span>
        <span className="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-teal-900">{lesson.type}</span>
        <input
          value={lesson.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          aria-label={`Lesson ${index + 1} title`}
          className={`${inputCls} min-w-[8rem] flex-1 py-1.5`}
        />
        <label className="flex shrink-0 items-center gap-1 text-xs text-ink/80">
          <span className="sr-only">Duration in minutes</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={Math.round((lesson.durationSeconds / 60) * 10) / 10}
            onChange={(e) => onUpdate({ durationSeconds: Math.max(0, Math.round(Number(e.target.value) * 60)) })}
            className={`${inputCls} w-20 py-1.5`}
          />
          min
        </label>
        <label className="flex shrink-0 items-center gap-1 text-xs text-ink/80">
          <input type="checkbox" checked={lesson.isFreePreview} onChange={(e) => onUpdate({ isFreePreview: e.target.checked })} />
          Free preview
        </label>
        {otherModules.length > 0 && (
          <label className="shrink-0 text-xs text-ink/80">
            <span className="sr-only">Move lesson to another module</span>
            <select value="" onChange={(e) => e.target.value && onMoveToModule(e.target.value)} className="rounded-lg border border-teal-200 bg-white px-2 py-1.5 text-xs">
              <option value="">Move to…</option>
              {otherModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="shrink-0 rounded px-2 py-1 text-xs font-medium text-teal-800 hover:bg-teal-50">
          {open ? "Hide" : "Edit"}
        </button>
        <button type="button" onClick={onRemove} className="shrink-0 rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
          Remove
        </button>
      </div>

      {open && (
        <div className="mt-3 border-t border-teal-50 pt-3">
          {lesson.type === "VIDEO" && <VideoFields lesson={lesson} onUpdate={onUpdate} />}
          {lesson.type === "READING" && (
            <div className="space-y-3">
              <RichTextEditor content={lesson.readingHtml} onChange={(html) => onUpdate({ readingHtml: html })} label="Reading content" />
              <AttachmentsEditor items={lesson.attachments} onChange={(attachments) => onUpdate({ attachments })} />
            </div>
          )}
          {lesson.type === "RESOURCE" && <ResourceFields lesson={lesson} onUpdate={onUpdate} />}
          {lesson.type === "QUIZ" && <QuizFields lesson={lesson} onUpdate={onUpdate} />}
        </div>
      )}
    </li>
  );
}

function VideoFields({ lesson, onUpdate }: { lesson: EditableLesson; onUpdate: (patch: Partial<EditableLesson>) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <label className="text-xs font-medium text-ink/80">
          Video source
          <select value={lesson.videoSource} onChange={(e) => onUpdate({ videoSource: e.target.value as EditableLesson["videoSource"] })} className={`${inputCls} mt-1`}>
            <option value="file">Uploaded file</option>
            <option value="youtube">YouTube (unlisted)</option>
            <option value="vimeo">Vimeo (unlisted)</option>
          </select>
        </label>
        {lesson.videoSource === "file" ? (
          <FileUploadField
            target="lessonVideo"
            accept="video/mp4,video/webm,video/quicktime"
            label="Video file (MP4 / WebM)"
            buttonText={lesson.videoKey ? "Replace video" : "Upload video"}
            current={lesson.videoKey ? lesson.videoKey.split("/").pop() : undefined}
            onFileChosen={async (file) => {
              const seconds = await probeVideoDuration(file);
              if (seconds) onUpdate({ durationSeconds: seconds });
            }}
            onUploaded={(f) => onUpdate({ videoKey: f.key })}
          />
        ) : (
          <label className="text-xs font-medium text-ink/80">
            Watch URL
            <input
              value={lesson.videoUrl}
              onChange={(e) => {
                const detected = detectVideoSource(e.target.value);
                onUpdate({ videoUrl: e.target.value, ...(detected ? { videoSource: detected } : {}) });
              }}
              placeholder="https://www.youtube.com/watch?v=…"
              className={`${inputCls} mt-1`}
            />
          </label>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-ink/80">Captions (.vtt)</p>
        <ul className="mt-1 space-y-2">
          {lesson.captions.map((c, i) => (
            <li key={c.key} className="flex flex-wrap items-center gap-2 text-xs">
              <input value={c.label} onChange={(e) => onUpdate({ captions: lesson.captions.map((x, xi) => (xi === i ? { ...x, label: e.target.value } : x)) })} aria-label="Caption label" className={`${inputCls} w-32 py-1`} />
              <input value={c.lang} onChange={(e) => onUpdate({ captions: lesson.captions.map((x, xi) => (xi === i ? { ...x, lang: e.target.value } : x)) })} aria-label="Caption language code" className={`${inputCls} w-16 py-1`} />
              <span className="max-w-[12rem] truncate text-ink/70">{c.key.split("/").pop()}</span>
              <button type="button" className="text-red-700 hover:underline" onClick={() => onUpdate({ captions: lesson.captions.filter((_, xi) => xi !== i) })}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2">
          <FileUploadField
            target="caption"
            accept="text/vtt,.vtt"
            label="Add a caption track"
            buttonText="Upload .vtt"
            onUploaded={(f) => onUpdate({ captions: [...lesson.captions, { label: "English", lang: "en", key: f.key }] })}
          />
        </div>
      </div>

      <label className="block text-xs font-medium text-ink/80">
        Transcript (optional)
        <textarea value={lesson.transcript} onChange={(e) => onUpdate({ transcript: e.target.value })} rows={3} className={`${inputCls} mt-1`} />
      </label>

      <AttachmentsEditor items={lesson.attachments} onChange={(attachments) => onUpdate({ attachments })} />
    </div>
  );
}

function AttachmentsEditor({ items, onChange }: { items: EditableLesson["attachments"]; onChange: (items: EditableLesson["attachments"]) => void }) {
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  return (
    <div>
      <p className="text-xs font-medium text-ink/80">Downloadable resources</p>
      <ul className="mt-1 space-y-1">
        {items.map((a, i) => (
          <li key={`${a.key ?? a.url}-${i}`} className="flex items-center gap-2 text-xs">
            <span className="rounded bg-teal-50 px-1.5 py-0.5 text-teal-900">{a.kind}</span>
            <span className="min-w-0 flex-1 truncate">{a.label}</span>
            <button type="button" className="text-red-700 hover:underline" onClick={() => onChange(items.filter((_, xi) => xi !== i))}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <FileUploadField
          target="resource"
          accept=".pdf,.zip,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
          label="Attach a file"
          buttonText="Upload file"
          onUploaded={(f) => onChange([...items, { kind: "file", label: f.filename, key: f.key, filename: f.filename }])}
        />
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-ink/80">
            Link label
            <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} className={`${inputCls} mt-1 w-36 py-1`} />
          </label>
          <label className="text-xs text-ink/80">
            URL
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className={`${inputCls} mt-1 w-48 py-1`} />
          </label>
          <button
            type="button"
            disabled={!linkLabel.trim() || !/^https?:\/\//.test(linkUrl)}
            onClick={() => {
              onChange([...items, { kind: "link", label: linkLabel.trim(), url: linkUrl.trim() }]);
              setLinkLabel("");
              setLinkUrl("");
            }}
            className={`${chip} disabled:opacity-50`}
          >
            Add link
          </button>
        </div>
      </div>
    </div>
  );
}

function ResourceFields({ lesson, onUpdate }: { lesson: EditableLesson; onUpdate: (patch: Partial<EditableLesson>) => void }) {
  const r = lesson.resource;
  const kind = r?.kind ?? "file";
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-ink/80">
        Description (optional)
        <textarea value={lesson.resourceDescription} onChange={(e) => onUpdate({ resourceDescription: e.target.value })} rows={2} className={`${inputCls} mt-1`} />
      </label>
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <label className="text-xs font-medium text-ink/80">
          Type
          <select
            value={kind}
            onChange={(e) => onUpdate({ resource: { kind: e.target.value as "file" | "link", label: r?.label ?? "Resource" } })}
            className={`${inputCls} mt-1`}
          >
            <option value="file">File upload</option>
            <option value="link">External link</option>
          </select>
        </label>
        <label className="text-xs font-medium text-ink/80">
          Label
          <input
            value={r?.label ?? ""}
            onChange={(e) => onUpdate({ resource: { ...(r ?? { kind }), kind, label: e.target.value } })}
            className={`${inputCls} mt-1`}
          />
        </label>
      </div>
      {kind === "file" ? (
        <FileUploadField
          target="resource"
          accept=".pdf,.zip,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
          label="File"
          buttonText={r?.key ? "Replace file" : "Upload file"}
          current={r?.filename}
          onUploaded={(f) => onUpdate({ resource: { kind: "file", label: r?.label || f.filename, key: f.key, filename: f.filename } })}
        />
      ) : (
        <label className="block text-xs font-medium text-ink/80">
          URL
          <input
            value={r?.url ?? ""}
            onChange={(e) => onUpdate({ resource: { kind: "link", label: r?.label ?? "Resource", url: e.target.value } })}
            placeholder="https://…"
            className={`${inputCls} mt-1`}
          />
        </label>
      )}
    </div>
  );
}

function QuizFields({ lesson, onUpdate }: { lesson: EditableLesson; onUpdate: (patch: Partial<EditableLesson>) => void }) {
  const setQ = (qid: string, patch: Partial<QuestionPayload>) => onUpdate({ questions: lesson.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)) });

  function addQuestion() {
    onUpdate({
      questions: [
        ...lesson.questions,
        {
          id: newId(),
          question: "",
          type: "SINGLE",
          explanation: "",
          options: [
            { id: newId(), text: "", isCorrect: true },
            { id: newId(), text: "", isCorrect: false },
          ],
        },
      ],
    });
  }

  function changeType(q: QuestionPayload, type: QuestionPayload["type"]) {
    if (type === "TRUEFALSE") {
      setQ(q.id, {
        type,
        options: [
          { id: q.options[0]?.id ?? newId(), text: "True", isCorrect: true },
          { id: q.options[1]?.id ?? newId(), text: "False", isCorrect: false },
        ],
      });
    } else if (type === "SINGLE") {
      // Single choice can have only one correct answer.
      let seen = false;
      setQ(q.id, { type, options: q.options.map((o) => (o.isCorrect && !seen ? ((seen = true), o) : { ...o, isCorrect: false })) });
    } else setQ(q.id, { type });
  }

  function toggleCorrect(q: QuestionPayload, oid: string) {
    setQ(q.id, {
      options: q.options.map((o) => (q.type === "MULTI" ? (o.id === oid ? { ...o, isCorrect: !o.isCorrect } : o) : { ...o, isCorrect: o.id === oid })),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <label className="text-xs font-medium text-ink/80">
          Instructions
          <input value={lesson.quizInstructions} onChange={(e) => onUpdate({ quizInstructions: e.target.value })} className={`${inputCls} mt-1`} />
        </label>
        <label className="text-xs font-medium text-ink/80">
          Pass mark (%)
          <input type="number" min={1} max={100} value={lesson.passMark} onChange={(e) => onUpdate({ passMark: Math.min(100, Math.max(1, Number(e.target.value) || 70)) })} className={`${inputCls} mt-1`} />
        </label>
      </div>

      {lesson.questions.map((q, qi) => (
        <fieldset key={q.id} className="rounded-lg border border-teal-100 bg-teal-50/40 p-3">
          <legend className="px-1 text-xs text-ink/70">Question {qi + 1}</legend>
          <div className="flex flex-wrap items-center gap-2">
            <input value={q.question} onChange={(e) => setQ(q.id, { question: e.target.value })} placeholder="Question text" aria-label={`Question ${qi + 1} text`} className={`${inputCls} min-w-[10rem] flex-1 py-1.5`} />
            <select value={q.type} onChange={(e) => changeType(q, e.target.value as QuestionPayload["type"])} aria-label="Question type" className="rounded-lg border border-teal-200 bg-white px-2 py-1.5 text-xs">
              <option value="SINGLE">Single choice</option>
              <option value="MULTI">Multiple choice</option>
              <option value="TRUEFALSE">True / False</option>
            </select>
            <button type="button" onClick={() => onUpdate({ questions: lesson.questions.filter((x) => x.id !== q.id) })} className="shrink-0 rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
              Remove
            </button>
          </div>
          <div className="mt-2 space-y-1.5 sm:pl-4">
            {q.options.map((o, oi) => (
              <div key={o.id} className="flex items-center gap-2">
                <input
                  type={q.type === "MULTI" ? "checkbox" : "radio"}
                  name={`correct-${q.id}`}
                  checked={o.isCorrect}
                  onChange={() => toggleCorrect(q, o.id)}
                  aria-label={`Option ${oi + 1} is correct`}
                />
                <input
                  value={o.text}
                  disabled={q.type === "TRUEFALSE"}
                  onChange={(e) => setQ(q.id, { options: q.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)) })}
                  placeholder="Option text"
                  aria-label={`Option ${oi + 1} text`}
                  className={`${inputCls} min-w-0 flex-1 py-1`}
                />
                {q.type !== "TRUEFALSE" && (
                  <button type="button" onClick={() => setQ(q.id, { options: q.options.filter((x) => x.id !== o.id) })} className="shrink-0 text-xs text-red-700 hover:underline">
                    Remove
                  </button>
                )}
              </div>
            ))}
            {q.type !== "TRUEFALSE" && (
              <button type="button" onClick={() => setQ(q.id, { options: [...q.options, { id: newId(), text: "", isCorrect: false }] })} className="text-xs font-semibold text-teal-800 underline underline-offset-2">
                + Add option
              </button>
            )}
          </div>
          <input
            value={q.explanation}
            onChange={(e) => setQ(q.id, { explanation: e.target.value })}
            placeholder="Explanation shown after answering (optional)"
            aria-label={`Question ${qi + 1} explanation`}
            className={`${inputCls} mt-2 py-1.5 text-xs`}
          />
        </fieldset>
      ))}
      <button type="button" onClick={addQuestion} className={chip}>
        + Add question
      </button>
    </div>
  );
}
