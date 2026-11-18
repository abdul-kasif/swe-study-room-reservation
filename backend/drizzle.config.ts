import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import path from "path";

if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@localhost:${process.env.DB_PORT}/${process.env.POSTGRES_DB}`,
  },
});
