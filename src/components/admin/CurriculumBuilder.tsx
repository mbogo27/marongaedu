"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import RichTextEditor from "./RichTextEditor";

export type EditableOption = { id: string; text: string; isCorrect: boolean };
export type EditableQuestion = {
  id: string;
  question: string;
  type: "SINGLE" | "MULTI" | "TRUEFALSE";
  explanation: string;
  options: EditableOption[];
};
export type EditableLesson = {
  id: string;
  title: string;
  type: "VIDEO" | "READING" | "QUIZ" | "RESOURCE";
  minutes: number;
  isFreePreview: boolean;
  videoUrl: string;
  captionUrl: string;
  transcript: string;
  readingHtml: string;
  resourceLabel: string;
  resourceUrl: string;
  quizInstructions: string;
  questions: EditableQuestion[];
};
export type EditableModule = { id: string; title: string; description: string; lessons: EditableLesson[] };

const PLACEHOLDER_VIDEOS = Array.from({ length: 10 }, (_, i) => `/videos/placeholder-${i + 1}.mp4`);
const PLACEHOLDER_CAPTIONS = Array.from({ length: 10 }, (_, i) => `/captions/placeholder-${i + 1}.vtt`);

export function newLesson(type: EditableLesson["type"]): EditableLesson {
  return {
    id: `new-${nanoid(8)}`,
    title: "New lesson",
    type,
    minutes: 10,
    isFreePreview: false,
    videoUrl: PLACEHOLDER_VIDEOS[0],
    captionUrl: PLACEHOLDER_CAPTIONS[0],
    transcript: "",
    readingHtml: "<p></p>",
    resourceLabel: "",
    resourceUrl: "",
    quizInstructions: "Answer all questions. You need 70% to pass.",
    questions: [],
  };
}

export function newModule(index: number): EditableModule {
  return { id: `new-${nanoid(8)}`, title: `Module ${index}`, description: "", lessons: [] };
}

export default function CurriculumBuilder({
  modules,
  onChange,
}: {
  modules: EditableModule[];
  onChange: (modules: EditableModule[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleModuleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);
    onChange(arrayMove(modules, oldIndex, newIndex));
  }

  function updateModule(id: string, patch: Partial<EditableModule>) {
    onChange(modules.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function removeModule(id: string) {
    onChange(modules.filter((m) => m.id !== id));
  }
  function addModule() {
    onChange([...modules, newModule(modules.length + 1)]);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg text-teal-900">Curriculum builder</h2>
          <p className="text-sm text-ink/50">Drag modules to reorder. Add lessons underneath each one.</p>
        </div>
        <button type="button" onClick={addModule} className="rounded-full border border-teal-200 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50">
          + Add module
        </button>
      </div>

      {modules.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-teal-200 px-4 py-8 text-center text-sm text-ink/50">
          No modules yet — add one to start building the curriculum.
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
                  onUpdate={(patch) => updateModule(mod.id, patch)}
                  onRemove={() => removeModule(mod.id)}
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
  onUpdate,
  onRemove,
}: {
  mod: EditableModule;
  index: number;
  onUpdate: (patch: Partial<EditableModule>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mod.id });
  const [expanded, setExpanded] = useState(true);

  function updateLesson(lessonId: string, patch: Partial<EditableLesson>) {
    onUpdate({ lessons: mod.lessons.map((l) => (l.id === lessonId ? { ...l, ...patch } : l)) });
  }
  function removeLesson(lessonId: string) {
    onUpdate({ lessons: mod.lessons.filter((l) => l.id !== lessonId) });
  }
  function addLesson(type: EditableLesson["type"]) {
    onUpdate({ lessons: [...mod.lessons, newLesson(type)] });
  }
  function moveLesson(lessonId: string, dir: -1 | 1) {
    const idx = mod.lessons.findIndex((l) => l.id === lessonId);
    const target = idx + dir;
    if (target < 0 || target >= mod.lessons.length) return;
    const next = [...mod.lessons];
    [next[idx], next[target]] = [next[target], next[idx]];
    onUpdate({ lessons: next });
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="rounded-xl border border-teal-100 bg-teal-50/40 p-4"
    >
      <div className="flex items-center gap-3">
        <button type="button" {...attributes} {...listeners} className="shrink-0 cursor-grab touch-none px-1 text-ink/30" aria-label="Drag to reorder">
          ⠿
        </button>
        <span className="shrink-0 text-xs font-medium text-ink/40">#{index + 1}</span>
        <input
          value={mod.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="flex-1 rounded-lg border border-teal-100 bg-white px-3 py-2 text-sm font-medium focus:border-teal-400 focus:outline-none"
        />
        <button type="button" onClick={() => setExpanded((v) => !v)} className="shrink-0 rounded-lg px-2 py-2 text-xs text-ink/50 hover:bg-white">
          {expanded ? "Collapse" : "Expand"}
        </button>
        <button type="button" onClick={onRemove} className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50">
          Remove module
        </button>
      </div>

      {expanded && (
        <>
          <textarea
            value={mod.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Optional module description"
            rows={2}
            className="mt-3 w-full rounded-lg border border-teal-100 bg-white px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
          />

          <ul className="mt-3 flex flex-col gap-3 pl-4">
            {mod.lessons.map((lesson, li) => (
              <LessonEditor
                key={lesson.id}
                lesson={lesson}
                index={li}
                total={mod.lessons.length}
                onUpdate={(patch) => updateLesson(lesson.id, patch)}
                onRemove={() => removeLesson(lesson.id)}
                onMove={(dir) => moveLesson(lesson.id, dir)}
              />
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap gap-2 pl-4">
            <button type="button" onClick={() => addLesson("VIDEO")} className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50">
              + Video lesson
            </button>
            <button type="button" onClick={() => addLesson("READING")} className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50">
              + Reading lesson
            </button>
            <button type="button" onClick={() => addLesson("QUIZ")} className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50">
              + Quiz
            </button>
            <button type="button" onClick={() => addLesson("RESOURCE")} className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50">
              + Resource
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function LessonEditor({
  lesson,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  lesson: EditableLesson;
  index: number;
  total: number;
  onUpdate: (patch: Partial<EditableLesson>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [open, setOpen] = useState(false);

  function addQuestion() {
    const q: EditableQuestion = {
      id: `new-${nanoid(8)}`,
      question: "",
      type: "SINGLE",
      explanation: "",
      options: [
        { id: `new-${nanoid(8)}`, text: "", isCorrect: true },
        { id: `new-${nanoid(8)}`, text: "", isCorrect: false },
      ],
    };
    onUpdate({ questions: [...lesson.questions, q] });
  }
  function updateQuestion(qid: string, patch: Partial<EditableQuestion>) {
    onUpdate({ questions: lesson.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)) });
  }
  function removeQuestion(qid: string) {
    onUpdate({ questions: lesson.questions.filter((q) => q.id !== qid) });
  }
  function addOption(qid: string) {
    const q = lesson.questions.find((x) => x.id === qid);
    if (!q) return;
    updateQuestion(qid, { options: [...q.options, { id: `new-${nanoid(8)}`, text: "", isCorrect: false }] });
  }
  function updateOption(qid: string, oid: string, patch: Partial<EditableOption>) {
    const q = lesson.questions.find((x) => x.id === qid);
    if (!q) return;
    updateQuestion(qid, { options: q.options.map((o) => (o.id === oid ? { ...o, ...patch } : o)) });
  }
  function removeOption(qid: string, oid: string) {
    const q = lesson.questions.find((x) => x.id === qid);
    if (!q) return;
    updateQuestion(qid, { options: q.options.filter((o) => o.id !== oid) });
  }
  function toggleCorrect(qid: string, oid: string) {
    const q = lesson.questions.find((x) => x.id === qid);
    if (!q) return;
    if (q.type === "MULTI") {
      updateQuestion(qid, { options: q.options.map((o) => (o.id === oid ? { ...o, isCorrect: !o.isCorrect } : o)) });
    } else {
      updateQuestion(qid, { options: q.options.map((o) => ({ ...o, isCorrect: o.id === oid })) });
    }
  }

  return (
    <li className="rounded-lg border border-teal-100 bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs text-ink/40">{index + 1}.</span>
        <span className="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-teal-700">{lesson.type}</span>
        <input
          value={lesson.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="min-w-0 flex-1 rounded-lg border border-teal-100 px-3 py-1.5 text-sm focus:border-teal-400 focus:outline-none"
        />
        <input
          type="number"
          min={1}
          value={lesson.minutes}
          onChange={(e) => onUpdate({ minutes: Number(e.target.value) })}
          className="w-16 shrink-0 rounded-lg border border-teal-100 px-2 py-1.5 text-sm focus:border-teal-400 focus:outline-none"
        />
        <span className="shrink-0 text-xs text-ink/40">min</span>
        <label className="flex shrink-0 items-center gap-1 text-xs text-ink/60">
          <input type="checkbox" checked={lesson.isFreePreview} onChange={(e) => onUpdate({ isFreePreview: e.target.checked })} />
          Free preview
        </label>
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="shrink-0 rounded px-1.5 py-1 text-xs text-ink/40 hover:bg-teal-50 disabled:opacity-30">
          ↑
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="shrink-0 rounded px-1.5 py-1 text-xs text-ink/40 hover:bg-teal-50 disabled:opacity-30">
          ↓
        </button>
        <button type="button" onClick={() => setOpen((v) => !v)} className="shrink-0 rounded px-2 py-1 text-xs text-teal-700 hover:bg-teal-50">
          {open ? "Hide" : "Edit"}
        </button>
        <button type="button" onClick={onRemove} className="shrink-0 rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50">
          Remove
        </button>
      </div>

      {open && (
        <div className="mt-3 border-t border-teal-50 pt-3">
          {lesson.type === "VIDEO" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-ink/60">Video URL</label>
                <input
                  value={lesson.videoUrl}
                  onChange={(e) => onUpdate({ videoUrl: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
                />
                <div className="mt-1 flex flex-wrap gap-1">
                  {PLACEHOLDER_VIDEOS.map((v, i) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => onUpdate({ videoUrl: v, captionUrl: PLACEHOLDER_CAPTIONS[i] })}
                      className="rounded border border-teal-100 px-1.5 py-0.5 text-[10px] text-ink/50 hover:bg-teal-50"
                    >
                      Placeholder {i + 1}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-ink/60">Captions URL (.vtt, optional)</label>
                <input
                  value={lesson.captionUrl}
                  onChange={(e) => onUpdate({ captionUrl: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-ink/60">Transcript (optional)</label>
                <textarea
                  value={lesson.transcript}
                  onChange={(e) => onUpdate({ transcript: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {lesson.type === "READING" && (
            <div>
              <label className="text-xs font-medium text-ink/60">Content</label>
              <div className="mt-1">
                <RichTextEditor content={lesson.readingHtml} onChange={(html) => onUpdate({ readingHtml: html })} />
              </div>
            </div>
          )}

          {lesson.type === "RESOURCE" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-ink/60">Label</label>
                <input
                  value={lesson.resourceLabel}
                  onChange={(e) => onUpdate({ resourceLabel: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-ink/60">URL</label>
                <input
                  value={lesson.resourceUrl}
                  onChange={(e) => onUpdate({ resourceUrl: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {lesson.type === "QUIZ" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink/60">Instructions</label>
                <input
                  value={lesson.quizInstructions}
                  onChange={(e) => onUpdate({ quizInstructions: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
                />
              </div>
              {lesson.questions.map((q, qi) => (
                <div key={q.id} className="rounded-lg border border-teal-100 bg-teal-50/40 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink/40">Q{qi + 1}</span>
                    <input
                      value={q.question}
                      onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                      placeholder="Question text"
                      className="flex-1 rounded-lg border border-teal-100 bg-white px-3 py-1.5 text-sm focus:border-teal-400 focus:outline-none"
                    />
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(q.id, { type: e.target.value as EditableQuestion["type"] })}
                      className="rounded-lg border border-teal-100 bg-white px-2 py-1.5 text-xs"
                    >
                      <option value="SINGLE">Single choice</option>
                      <option value="MULTI">Multi choice</option>
                      <option value="TRUEFALSE">True/False</option>
                    </select>
                    <button type="button" onClick={() => removeQuestion(q.id)} className="shrink-0 rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50">
                      Remove
                    </button>
                  </div>
                  <div className="mt-2 space-y-1.5 pl-4">
                    {q.options.map((o) => (
                      <div key={o.id} className="flex items-center gap-2">
                        <input
                          type={q.type === "MULTI" ? "checkbox" : "radio"}
                          name={`correct-${q.id}`}
                          checked={o.isCorrect}
                          onChange={() => toggleCorrect(q.id, o.id)}
                        />
                        <input
                          value={o.text}
                          onChange={(e) => updateOption(q.id, o.id, { text: e.target.value })}
                          placeholder="Option text"
                          className="min-w-0 flex-1 rounded-lg border border-teal-100 bg-white px-2 py-1 text-sm focus:border-teal-400 focus:outline-none"
                        />
                        <button type="button" onClick={() => removeOption(q.id, o.id)} className="shrink-0 text-xs text-red-500 hover:underline">
                          Remove
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addOption(q.id)} className="text-xs font-medium text-teal-700 hover:underline">
                      + Add option
                    </button>
                  </div>
                  <input
                    value={q.explanation}
                    onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                    placeholder="Explanation shown after answering (optional)"
                    className="mt-2 w-full rounded-lg border border-teal-100 bg-white px-3 py-1.5 text-xs focus:border-teal-400 focus:outline-none"
                  />
                </div>
              ))}
              <button type="button" onClick={addQuestion} className="rounded-full border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50">
                + Add question
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
