import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import path from "path";

// Load the .env file from the root directory (one level up)
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@localhost:${process.env.DB_PORT}/${process.env.POSTGRES_DB}`,
  },
});
