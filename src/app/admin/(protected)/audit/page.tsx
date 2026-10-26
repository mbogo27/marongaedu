import { db } from "@/lib/db";
import { PageHeader, Pager, filterButton, filterInput, tableWrap, td, th } from "@/components/admin/ui";
import type { Prisma } from "@prisma/client";

const PER_PAGE = 50;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; actor?: string; target?: string; from?: string; to?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.AuditLogWhereInput = {
    ...(sp.action ? { action: { startsWith: sp.action } } : {}),
    ...(sp.actor ? { actorId: sp.actor } : {}),
    ...(sp.target ? { targetId: sp.target } : {}),
    ...(sp.from || sp.to
      ? { createdAt: { ...(sp.from ? { gte: new Date(sp.from) } : {}), ...(sp.to ? { lte: new Date(new Date(sp.to).getTime() + 86_399_999) } : {}) } }
      : {}),
  };

  const [total, rows, actions] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    db.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
  ]);
  const actorIds = [...new Set(rows.map((r) => r.actorId).filter((x): x is string => !!x))];
  const actors = new Map((await db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, email: true } })).map((u) => [u.id, u]));
  const groups = [...new Set(actions.map((a) => a.action.split(".")[0]))];

  return (
    <div>
      <PageHeader title="Audit log" />
      <p className="mt-1 text-sm text-ink/70">Admin actions and security events: logins, failed attempts, password changes, role changes, refunds, deletions and publishes.</p>

      <form className="mt-4 flex flex-wrap items-end gap-3" role="search" aria-label="Filter audit log">
        <label className="text-xs text-ink/80">
          Event
          <select name="action" defaultValue={sp.action ?? ""} className={`${filterInput} mt-1 block`}>
            <option value="">All events</option>
            {groups.map((g) => (
              <option key={g} value={`${g}.`}>{g}.*</option>
            ))}
            {actions.map((a) => (
              <option key={a.action} value={a.action}>{a.action}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink/80">
          Actor ID
          <input name="actor" defaultValue={sp.actor} className={`${filterInput} mt-1 block w-44`} />
        </label>
        <label className="text-xs text-ink/80">
          Target ID
          <input name="target" defaultValue={sp.target} className={`${filterInput} mt-1 block w-44`} />
        </label>
        <label className="text-xs text-ink/80">
          From
          <input type="date" name="from" defaultValue={sp.from} className={`${filterInput} mt-1 block`} />
        </label>
        <label className="text-xs text-ink/80">
          To
          <input type="date" name="to" defaultValue={sp.to} className={`${filterInput} mt-1 block`} />
        </label>
        <button type="submit" className={filterButton}>Filter</button>
      </form>

      <div className={`mt-6 ${tableWrap}`}>
        <table className="w-full min-w-[900px] text-sm">
          <caption className="sr-only">Audit log</caption>
          <thead className="border-b border-teal-100 text-left text-ink/70">
            <tr>
              <th scope="col" className={th}>When</th>
              <th scope="col" className={th}>Event</th>
              <th scope="col" className={th}>Actor</th>
              <th scope="col" className={th}>Target</th>
              <th scope="col" className={th}>IP</th>
              <th scope="col" className={th}>Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-50">
            {rows.map((r) => {
              const actor = r.actorId ? actors.get(r.actorId) : undefined;
              return (
                <tr key={r.id}>
                  <td className={`${td} whitespace-nowrap text-ink/70`}>{r.createdAt.toLocaleString("en-KE")}</td>
                  <td className={`${td} font-mono text-xs text-ink`}>{r.action}</td>
                  <td className={`${td} text-ink/80`}>{actor ? `${actor.name}` : r.actorId ? r.actorId.slice(0, 8) : "—"}</td>
                  <td className={`${td} text-xs text-ink/70`}>{r.targetType ? `${r.targetType} ${r.targetId?.slice(0, 10) ?? ""}` : "—"}</td>
                  <td className={`${td} text-xs text-ink/70`}>{r.ip ?? "—"}</td>
                  <td className={`${td} max-w-xs truncate text-xs text-ink/70`} title={r.meta ? JSON.stringify(r.meta) : undefined}>{r.meta ? JSON.stringify(r.meta) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink/70">No events match.</p>}
      </div>
      <Pager page={page} pages={Math.ceil(total / PER_PAGE)} basePath="/admin/audit" params={sp} />
    </div>
  );
}
