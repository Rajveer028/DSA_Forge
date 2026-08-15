import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * DSA Forge stores everything in a local SQLite file, so no configuration is
 * required to run the project. Set DATABASE_URL only to move the file.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./prisma/dsaforge.db",
  },
});
