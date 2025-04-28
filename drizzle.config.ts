import { defineConfig } from "drizzle-kit";
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./migrations",
  driver: "better-sqlite3",
  dbCredentials: {
    url: join(__dirname, "database.sqlite")
  },
  verbose: true,
  strict: true
});