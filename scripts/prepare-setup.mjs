import { copyFileSync } from "node:fs";
copyFileSync(
  new URL("../supabase/setup.sql", import.meta.url),
  new URL("../public/setup.sql", import.meta.url),
);
