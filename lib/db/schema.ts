import { date, index, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull(),
  useCase: text("use_case"), // designer | developer | photographer | artist | writer | other
  createdAt: createdAt(),
});

export const sites = pgTable(
  "sites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").unique("sites_slug_key"), // null until the first publish (Step 6)
    name: text("name").notNull(),
    draft: jsonb("draft").notNull(),
    published: jsonb("published"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [index("sites_user_id_idx").on(t.userId)],
);

export const snapshots = pgTable(
  "snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
    data: jsonb("data").notNull(),
    reason: text("reason").notNull(), // ai_run | publish | manual
    createdAt: createdAt(),
  },
  (t) => [index("snapshots_site_id_created_at_idx").on(t.siteId, t.createdAt)],
);

export const aiRuns = pgTable(
  "ai_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    siteId: uuid("site_id").references(() => sites.id, { onDelete: "set null" }),
    kind: text("kind").notNull(), // generate | edit | prettify
    prompt: text("prompt").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
    durationMs: integer("duration_ms"),
    status: text("status").notNull(), // running | succeeded | failed | aborted
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [index("ai_runs_user_id_created_at_idx").on(t.userId, t.createdAt)],
);

export const uploads = pgTable(
  "uploads",
  {
    id: uuid("id").primaryKey(), // chosen by the app when it hands out the upload link (Step 10)
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    path: text("path").notNull(), // /uploads/{userId}/{id}.webp
    bytes: integer("bytes").notNull().default(0),
    status: text("status").notNull(), // ready | rejected (written by the Neon Function, Step 10)
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [index("uploads_user_id_created_at_idx").on(t.userId, t.createdAt)],
);

export const pageViewsDaily = pgTable(
  "page_views_daily",
  {
    siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
    day: date("day").notNull(), // "YYYY-MM-DD", the UTC date
    views: integer("views").notNull().default(0),
    mobile: integer("mobile").notNull().default(0),
    desktop: integer("desktop").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.siteId, t.day] })],
);

export const referrersDaily = pgTable(
  "referrers_daily",
  {
    siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    host: text("host").notNull(),
    views: integer("views").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.siteId, t.day, t.host] })],
);
