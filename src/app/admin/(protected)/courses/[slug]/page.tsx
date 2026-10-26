import { notFound } from "next/navigation";
import CourseEditorForm from "@/components/admin/CourseEditorForm";
import { loadEditorData } from "@/lib/admin/editor-data";

export default async function EditCoursePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const data = await loadEditorData(slug);
  if (!data) notFound();
  return <CourseEditorForm key={data.initial.id ?? "new"} {...data} initialTab={tab} />;
}
