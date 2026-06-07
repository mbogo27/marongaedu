import AdminShell from "@/components/admin/AdminShell";
import { students } from "@/lib/data";

export default function AdminStudentsPage() {
  return (
    <AdminShell>
      <h1 className="font-serif text-2xl text-teal-900">Students</h1>
      <p className="text-ink/60">Everyone currently enrolled across your courses.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-teal-50/70 text-xs uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-5 py-3 font-medium">Student</th>
              <th className="px-5 py-3 font-medium">Course</th>
              <th className="px-5 py-3 font-medium">Enrolled</th>
              <th className="px-5 py-3 font-medium">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-100">
            {students.map((s) => (
              <tr key={s.email} className="transition hover:bg-teal-50/40">
                <td className="px-5 py-4">
                  <p className="font-medium text-ink">{s.name}</p>
                  <p className="text-xs text-ink/50">{s.email}</p>
                </td>
                <td className="px-5 py-4 text-ink/70">{s.course}</td>
                <td className="px-5 py-4 text-ink/70">
                  {new Date(s.enrolledOn).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-teal-100">
                      <div className="h-full rounded-full bg-gold-500" style={{ width: `${s.progress}%` }} />
                    </div>
                    <span className="text-xs text-ink/50">{s.progress}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-ink/40">Demo build — student list shown is mock data.</p>
    </AdminShell>
  );
}
