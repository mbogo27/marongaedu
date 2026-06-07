import Link from "next/link";
import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import CourseEditorForm from "@/components/admin/CourseEditorForm";
import { courses, getCourseBySlug } from "@/lib/data";

export function generateStaticParams() {
  return [...courses.map((c) => ({ slug: c.slug })), { slug: "new" }];
}

export default async function AdminCourseEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const isNew = slug === "new";
  const course = isNew ? undefined : getCourseBySlug(slug);

  if (!isNew && !course) notFound();

  return (
    <AdminShell>
      <div className="mb-6">
        <Link href="/admin/courses" className="text-sm font-medium text-teal-600 hover:underline">
          ← Back to courses
        </Link>
        <h1 className="mt-2 font-serif text-2xl text-teal-900">
          {isNew ? "New course" : "Edit course"}
        </h1>
        <p className="text-ink/60">
          {isNew
            ? "Set up the basics, then build out the curriculum below."
            : "Update the details students see, and keep the curriculum current."}
        </p>
      </div>
      <CourseEditorForm course={course} />
    </AdminShell>
  );
}
