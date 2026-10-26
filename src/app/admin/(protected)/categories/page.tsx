import { db } from "@/lib/db";
import CategoryModal from "@/components/admin/CategoryModal";
import ConfirmAction from "@/components/admin/ConfirmAction";
import { deleteCategoryAction } from "@/lib/actions/admin/categories";
import { PageHeader, dangerBtn, tableWrap, td, th } from "@/components/admin/ui";

const BTN = "rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800";

export default async function AdminCategoriesPage() {
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { courses: { where: { deletedAt: null } } } } },
  });

  return (
    <div>
      <PageHeader title="Categories" actions={<CategoryModal trigger="+ New category" triggerClassName={BTN} />} />
      <div className={`mt-6 ${tableWrap}`}>
        <table className="w-full text-sm">
          <caption className="sr-only">Categories</caption>
          <thead className="border-b border-teal-100 text-left text-ink/70">
            <tr>
              <th scope="col" className={th}>Name</th>
              <th scope="col" className={th}>Slug</th>
              <th scope="col" className={th}>Order</th>
              <th scope="col" className={th}>Courses</th>
              <th scope="col" className={th}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-50">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className={`${td} font-medium text-ink`}>{c.name}</td>
                <td className={`${td} text-ink/70`}>{c.slug}</td>
                <td className={`${td} text-ink/70`}>{c.sortOrder}</td>
                <td className={`${td} text-ink/80`}>{c._count.courses}</td>
                <td className={td}>
                  <div className="flex gap-3">
                    <CategoryModal category={c} trigger="Edit" />
                    {c._count.courses > 0 ? (
                      <span className="text-xs text-ink/70">In use</span>
                    ) : (
                      <ConfirmAction className={dangerBtn} confirm={`Delete ${c.name}?`} action={deleteCategoryAction.bind(null, c.id)}>Delete</ConfirmAction>
                    )}
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
