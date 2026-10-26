import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { cancelInviteAction, demoteAdminAction, suspendAdminAction, unsuspendAdminAction } from "@/lib/actions/admin/team";
import ConfirmAction from "@/components/admin/ConfirmAction";
import { InviteAdminForm, PromoteUserForm } from "@/components/admin/TeamForms";
import { SettingsCard } from "@/components/admin/settings-ui";
import { Badge, dangerBtn, statusTone, tableWrap, td, th } from "@/components/admin/ui";

export default async function TeamPage() {
  const me = await requireAdmin();
  const [admins, invites] = await Promise.all([
    db.user.findMany({ where: { role: "ADMIN", deletedAt: null }, orderBy: { createdAt: "asc" } }),
    db.verificationToken.findMany({ where: { purpose: "ADMIN_INVITE", usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-6">
      <SettingsCard title="Admin team" id="team" description="Admins can manage everything. There is no public admin sign-up; invite colleagues here. At least one active admin must always remain.">
        <div className={tableWrap}>
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Admins</caption>
            <thead className="border-b border-teal-100 text-left text-ink/70">
              <tr>
                <th scope="col" className={th}>Name</th>
                <th scope="col" className={th}>Email</th>
                <th scope="col" className={th}>Since</th>
                <th scope="col" className={th}>Status</th>
                <th scope="col" className={th}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-50">
              {admins.map((a) => (
                <tr key={a.id}>
                  <td className={`${td} font-medium text-ink`}>{a.name} {a.id === me.id && <span className="text-xs font-normal text-ink/70">(you)</span>}</td>
                  <td className={`${td} text-ink/80`}>{a.email}</td>
                  <td className={`${td} text-ink/70`}>{formatDate(a.createdAt)}</td>
                  <td className={td}><Badge tone={statusTone(a.status)}>{a.status}</Badge></td>
                  <td className={td}>
                    {a.id === me.id ? (
                      <span className="text-xs text-ink/70">—</span>
                    ) : (
                      <div className="flex gap-3">
                        {a.status === "ACTIVE" ? (
                          <ConfirmAction confirm={`Suspend ${a.name}?`} action={suspendAdminAction.bind(null, a.id)}>Suspend</ConfirmAction>
                        ) : (
                          <ConfirmAction action={unsuspendAdminAction.bind(null, a.id)}>Unsuspend</ConfirmAction>
                        )}
                        <ConfirmAction className={dangerBtn} confirm={`Remove admin rights from ${a.name}?`} action={demoteAdminAction.bind(null, a.id)}>Demote</ConfirmAction>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsCard>

      <SettingsCard title="Invite a colleague" id="invite">
        <InviteAdminForm />
        {invites.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-ink/80">Pending invitations</h3>
            <ul className="mt-2 divide-y divide-teal-50 text-sm">
              {invites.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                  <span>{i.identifier} <span className="text-xs text-ink/70">· expires {i.expiresAt.toLocaleString("en-KE")}</span></span>
                  <ConfirmAction className={dangerBtn} action={cancelInviteAction.bind(null, i.id)}>Cancel</ConfirmAction>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SettingsCard>

      <SettingsCard title="Promote an existing learner" id="promote" description="For someone who already has a verified account.">
        <PromoteUserForm />
      </SettingsCard>
    </div>
  );
}
