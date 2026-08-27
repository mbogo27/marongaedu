import { db } from "@/lib/db";
import CourseEditorForm from "@/components/admin/CourseEditorForm";

export default async function NewCoursePage() {
  const categories = await db.category.findMany({ orderBy: { name: "asc" } });
  return <CourseEditorForm categories={categories} />;
}
