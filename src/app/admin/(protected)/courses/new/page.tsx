import CourseEditorForm from "@/components/admin/CourseEditorForm";
import { loadEditorData } from "@/lib/admin/editor-data";

export default async function NewCoursePage() {
  const data = await loadEditorData(null);
  return <CourseEditorForm key="new" {...data!} />;
}
