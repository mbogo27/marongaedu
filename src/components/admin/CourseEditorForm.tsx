"use client";

import { useState } from "react";
import Image from "next/image";
import type { Course, Level, Module } from "@/lib/types";

const levels: Level[] = ["Beginner", "Intermediate", "Advanced", "All levels"];

let moduleSeq = 0;
let lessonSeq = 0;
function nextModuleId() {
  moduleSeq += 1;
  return `new-module-${moduleSeq}`;
}
function nextLessonId() {
  lessonSeq += 1;
  return `new-lesson-${lessonSeq}`;
}

type EditableLesson = { id: string; title: string; minutes: number };
type EditableModule = { id: string; title: string; lessons: EditableLesson[] };

function toEditable(modules: Module[]): EditableModule[] {
  return modules.map((m) => ({
    id: nextModuleId(),
    title: m.title,
    lessons: m.lessons.map((l) => ({ id: nextLessonId(), title: l.title, minutes: l.minutes })),
  }));
}

export default function CourseEditorForm({ course }: { course?: Course }) {
  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description.join("\n\n") ?? "");
  const [price, setPrice] = useState(course?.priceKes.toString() ?? "");
  const [level, setLevel] = useState<Level>(course?.level ?? "Beginner");
  const [thumbName, setThumbName] = useState<string | null>(null);
  const [modules, setModules] = useState<EditableModule[]>(
    course ? toEditable(course.modules) : []
  );
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2400);
  }

  function addModule() {
    setModules((prev) => [...prev, { id: nextModuleId(), title: `Module ${prev.length + 1} — Untitled`, lessons: [] }]);
  }
  function removeModule(id: string) {
    setModules((prev) => prev.filter((m) => m.id !== id));
  }
  function renameModule(id: string, value: string) {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, title: value } : m)));
  }
  function addLesson(moduleId: string) {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, lessons: [...m.lessons, { id: nextLessonId(), title: "New lesson", minutes: 10 }] }
          : m
      )
    );
  }
  function removeLesson(moduleId: string, lessonId: string) {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) } : m
      )
    );
  }
  function renameLesson(moduleId: string, lessonId: string, value: string) {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, title: value } : l)) }
          : m
      )
    );
  }
  function setLessonMinutes(moduleId: string, lessonId: string, minutes: number) {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, minutes } : l)) }
          : m
      )
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    showToast(course ? "Course saved." : "Course created as a draft.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="grid gap-6 rounded-2xl border border-teal-100 bg-white p-6 shadow-sm lg:grid-cols-[1fr_240px]">
        <div className="flex flex-col gap-5">
          <div>
            <label htmlFor="course-title" className="text-sm font-medium text-ink/70">
              Title
            </label>
            <input
              id="course-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Endodontic Fundamentals: Diagnosis to Obturation"
              className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
          </div>

          <div>
            <label htmlFor="course-description" className="text-sm font-medium text-ink/70">
              Description
            </label>
            <textarea
              id="course-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="What will students learn, and why should they trust you to teach it?"
              className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="course-price" className="text-sm font-medium text-ink/70">
                Price (KES)
              </label>
              <div className="mt-1 flex items-center rounded-lg border border-teal-100 focus-within:border-teal-400 focus-within:ring-1 focus-within:ring-teal-400">
                <span className="pl-4 text-sm text-ink/40">KSh</span>
                <input
                  id="course-price"
                  type="number"
                  min={0}
                  step={50}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="6000"
                  className="w-full rounded-lg px-2 py-2.5 text-sm focus:outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-ink/40">Flat one-time price per course.</p>
            </div>
            <div>
              <label htmlFor="course-level" className="text-sm font-medium text-ink/70">
                Level
              </label>
              <select
                id="course-level"
                value={level}
                onChange={(e) => setLevel(e.target.value as Level)}
                className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              >
                {levels.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-ink/70">Thumbnail</p>
          <div className="relative mt-1 aspect-video w-full overflow-hidden rounded-xl border border-teal-100 bg-teal-50">
            <Image
              src={`https://picsum.photos/seed/${course?.thumbnailSeed ?? "maronga-new-course"}/480/320`}
              alt=""
              fill
              className="object-cover"
            />
          </div>
          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-teal-200 px-4 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => setThumbName(e.target.files?.[0]?.name ?? null)}
            />
            {thumbName ? `Selected: ${thumbName}` : "Upload new thumbnail"}
          </label>
          <p className="mt-1 text-xs text-ink/40">
            Demo only — uploads aren&apos;t stored. JPG or PNG, 16:10 recommended.
          </p>
        </div>
      </div>

      {/* Curriculum builder */}
      <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg text-teal-900">Curriculum builder</h2>
            <p className="text-sm text-ink/50">Add modules, then add lessons underneath each one.</p>
          </div>
          <button
            type="button"
            onClick={addModule}
            className="rounded-full border border-teal-200 px-4 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-50"
          >
            + Add module
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {modules.length === 0 && (
            <p className="rounded-xl border border-dashed border-teal-200 px-4 py-8 text-center text-sm text-ink/50">
              No modules yet — add one to start building the curriculum.
            </p>
          )}
          {modules.map((mod, mi) => (
            <div key={mod.id} className="rounded-xl border border-teal-100 bg-teal-50/40 p-4">
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-xs font-medium text-ink/40">#{mi + 1}</span>
                <input
                  value={mod.title}
                  onChange={(e) => renameModule(mod.id, e.target.value)}
                  className="flex-1 rounded-lg border border-teal-100 bg-white px-3 py-2 text-sm font-medium focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                />
                <button
                  type="button"
                  onClick={() => removeModule(mod.id)}
                  className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50"
                >
                  Remove module
                </button>
              </div>

              <ul className="mt-3 flex flex-col gap-2 pl-7">
                {mod.lessons.map((lesson, li) => (
                  <li key={lesson.id} className="flex items-center gap-3">
                    <span className="shrink-0 text-xs text-ink/40">{li + 1}.</span>
                    <input
                      value={lesson.title}
                      onChange={(e) => renameLesson(mod.id, lesson.id, e.target.value)}
                      className="flex-1 rounded-lg border border-teal-100 bg-white px-3 py-1.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                    />
                    <input
                      type="number"
                      min={1}
                      value={lesson.minutes}
                      onChange={(e) => setLessonMinutes(mod.id, lesson.id, Number(e.target.value))}
                      className="w-20 shrink-0 rounded-lg border border-teal-100 bg-white px-2 py-1.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                    />
                    <span className="shrink-0 text-xs text-ink/40">min</span>
                    <button
                      type="button"
                      onClick={() => removeLesson(mod.id, lesson.id)}
                      className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => addLesson(mod.id)}
                className="mt-3 ml-7 rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-50"
              >
                + Add lesson
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="rounded-full bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          {course ? "Save changes" : "Create course"}
        </button>
        <button
          type="button"
          onClick={() => showToast("Saved as draft.")}
          className="rounded-full border border-teal-100 px-6 py-2.5 text-sm font-medium text-ink/70 transition hover:bg-teal-50"
        >
          Save as draft
        </button>
        <p className="text-xs text-ink/40">
          Demo build — changes aren&apos;t persisted beyond this session.
        </p>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-teal-900 px-5 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </form>
  );
}
