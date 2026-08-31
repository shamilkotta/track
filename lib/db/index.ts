import { drizzle } from "drizzle-orm/d1";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

export function db() {
  return drizzle(getEnv().DB, { schema });
}

export { schema };
