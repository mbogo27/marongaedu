import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  tags?: Record<string, string>;
};

export type EmailSendResult = { providerMessageId?: string };

/** Spec §4: swap providers by config, never by rewriting features. */
export interface EmailProvider {
  readonly id: "console" | "resend";
  send(message: EmailMessage): Promise<EmailSendResult>;
}

/** Dev default: print, and surface in the admin notifications feed. */
export class ConsoleEmailProvider implements EmailProvider {
  readonly id = "console" as const;
  async send(message: EmailMessage): Promise<EmailSendResult> {
    console.log(`[email:console] to=${message.to} subject="${message.subject}"\n${message.text}\n`);
    await db.notification.create({
      data: { type: "email", payload: { to: message.to, subject: message.subject, body: message.text } },
    });
    return { providerMessageId: `console-${Date.now()}` };
  }
}

/** Resend REST API — no SDK needed. */
export class ResendEmailProvider implements EmailProvider {
  readonly id = "resend" as const;
  async send(message: EmailMessage): Promise<EmailSendResult> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        tags: Object.entries(message.tags ?? {}).map(([name, value]) => ({ name, value })),
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const body = (await res.json()) as { id?: string };
    return { providerMessageId: body.id };
  }
}

let provider: EmailProvider | undefined;
export function getEmailProvider(): EmailProvider {
  provider ??= env.EMAIL_PROVIDER === "resend" ? new ResendEmailProvider() : new ConsoleEmailProvider();
  return provider;
}

/** Test seam. */
export function setEmailProvider(p: EmailProvider | undefined) {
  provider = p;
}
