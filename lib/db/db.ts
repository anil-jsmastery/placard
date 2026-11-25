import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// One pool per server instance, on the pooled DATABASE_URL. On Vercel, attachDatabasePool
// closes idle connections before the instance is suspended.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 5 });
attachDatabasePool(pool);

export const db = drizzle({ client: pool, schema });
