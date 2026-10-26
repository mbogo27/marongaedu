import "dotenv/config";
import readline from "node:readline";
import { db } from "../src/lib/db";
import { createCredentialUser, setPassword } from "../src/lib/auth/users";
import { isCommonPassword } from "../src/lib/auth/password";
import { issueToken } from "../src/lib/auth/verification";
import { sendEmail } from "../src/lib/email/send";
import { PASSWORD_MIN_LENGTH } from "../src/lib/password-policy";
import { audit } from "../src/lib/audit";

/**
 * Bootstrap the first admin (spec §3.8; there is no admin self-signup).
 *
 *   npm run admin:create -- --email you@example.com --name "Your Name"
 *   npm run admin:create -- --email you@example.com --name "Your Name" --send-link
 *
 * Without --send-link it prompts for a password (input hidden). With
 * --send-link it creates the account without a usable password and emails a
 * set-password link through the configured email provider.
 * If the email already has an account it is promoted to admin.
 */

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
    process.stdout.write(question);
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      if (s.includes("\n") || s.includes("\r")) write.call(rl, s);
    };
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim();
  const sendLink = process.argv.includes("--send-link");
  if (!email || !name) {
    console.error('Usage: npm run admin:create -- --email <email> --name "<full name>" [--send-link]');
    process.exit(1);
  }

  const existing = await db.user.findFirst({ where: { email, deletedAt: null } });
  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { role: "ADMIN", status: "ACTIVE", emailVerifiedAt: existing.emailVerifiedAt ?? new Date() } });
    await audit({ actorId: existing.id, action: "team.cli_promote", targetType: "user", targetId: existing.id, ip: "cli" });
    console.log(`Promoted existing account ${email} to admin.`);
    return;
  }

  if (sendLink) {
    // Random throwaway password nobody knows; the emailed link sets the real one.
    const user = await createCredentialUser({ name, email, password: `${crypto.randomUUID()}-${crypto.randomUUID()}`, role: "ADMIN", verified: true });
    const token = await issueToken({ purpose: "RESET_PASSWORD", identifier: email, userId: user.id });
    await sendEmail("passwordReset", email, { name }, { link: `/reset-password?token=${token}`, userId: user.id });
    await audit({ actorId: user.id, action: "team.cli_create", targetType: "user", targetId: user.id, ip: "cli" });
    console.log(`Created admin ${email}. A set-password link was sent via the ${process.env.EMAIL_PROVIDER ?? "console"} email provider.`);
    return;
  }

  const password = arg("password") ?? (await promptHidden("Password: "));
  if (password.length < PASSWORD_MIN_LENGTH || isCommonPassword(password)) {
    console.error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters and not a common password.`);
    process.exit(1);
  }
  const user = await createCredentialUser({ name, email, password, role: "ADMIN", verified: true });
  await setPassword(user.id, password);
  await audit({ actorId: user.id, action: "team.cli_create", targetType: "user", targetId: user.id, ip: "cli" });
  console.log(`Created admin ${email}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
