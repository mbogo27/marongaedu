/** Enrollment eligibility (spec §5.1–5.2). Pure; callers supply counts and existing state. */

export type EnrollmentGate = "open" | "enrolled" | "sold_out" | "closed" | "not_open";

export type GateInput = {
  enrollmentCap: number | null;
  enrollmentOpensAt: Date | null;
  enrollmentClosesAt: Date | null;
  /** Current ACTIVE enrollments in the course. */
  activeEnrollments: number;
  /** The viewer's existing enrollment status, if any. */
  existing: "ACTIVE" | "REVOKED" | null;
  now?: Date;
};

export function enrollmentGate(input: GateInput): EnrollmentGate {
  const now = input.now ?? new Date();
  if (input.existing === "ACTIVE") return "enrolled";
  if (input.enrollmentOpensAt && input.enrollmentOpensAt > now) return "not_open";
  if (input.enrollmentClosesAt && input.enrollmentClosesAt < now) return "closed";
  if (input.enrollmentCap != null && input.activeEnrollments >= input.enrollmentCap) return "sold_out";
  return "open";
}

export const GATE_MESSAGE_KEY = {
  enrolled: "enroll.already",
  sold_out: "enroll.sold_out",
  closed: "enroll.closed",
  not_open: "enroll.not_open",
} as const;
