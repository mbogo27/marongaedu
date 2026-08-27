import { db } from "@/lib/db";
import CategoryModal from "@/components/admin/CategoryModal";
import { deleteCategoryAction } from "@/lib/actions/admin/categories";

export default async function AdminCategoriesPage() {
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { courses: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-teal-900">Categories</h1>
        <CategoryModal trigger={<button className="rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">+ New category</button>} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-teal-100 text-left text-ink/50">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Courses</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-50">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                <td className="px-4 py-3 text-ink/50">{c.slug}</td>
                <td className="px-4 py-3 text-ink/60">{c._count.courses}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 text-xs">
                    <CategoryModal category={c} trigger={<button className="font-medium text-teal-700 hover:underline">Edit</button>} />
                    <form action={deleteCategoryAction.bind(null, c.id)}>
                      <button type="submit" className="font-medium text-red-500 hover:underline" disabled={c._count.courses > 0}>
                        {c._count.courses > 0 ? "In use" : "Delete"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
