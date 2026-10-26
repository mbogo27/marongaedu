import { execSync } from "node:child_process";

/** Point Prisma at the TEST database and apply all migrations before any test runs. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://maronga@localhost:5433/maronga_test";
  process.env.DATABASE_URL = url;
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}
