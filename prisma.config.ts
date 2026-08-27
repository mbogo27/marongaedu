import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 moved connection config out of schema.prisma; this file is read
// by the Prisma CLI (migrate/studio/seed), while src/lib/db.ts wires the
// same URL into a driver adapter for the PrismaClient at runtime.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
