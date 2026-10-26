import { notFound } from "next/navigation";
import CourseEditorForm from "@/components/admin/CourseEditorForm";
import { loadEditorData } from "@/lib/admin/editor-data";

export default async function EditCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadEditorData(slug);
  if (!data) notFound();
  return <CourseEditorForm key={data.initial.id ?? "new"} {...data} />;
}
