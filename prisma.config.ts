import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 keeps connection config out of schema.prisma. This file is read by
// the Prisma CLI (migrate/studio/seed); src/lib/db.ts wires the same URL into
// the pg driver adapter for the runtime PrismaClient.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://maronga:maronga@localhost:5432/maronga",
  },
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
