// Fills library_images (Lakebase Search, Step 4) from lib/images/library.json: one row per photo with an embedding of
// its tag and alt text from the Neon AI Gateway, then the two search indexes. Runs on `dev` from your machine
// (`npm run db:seed-library`) and on `production` in every Vercel build (Step 7). Photos that already have an embedding are
// skipped, so a run with nothing to do makes no gateway calls.
import "./load-env";
import fs from "node:fs";
import { neon } from "@neon/ai-sdk-provider";
import { embedMany } from "ai";
import { pool } from "../lib/db/db";
import { EMBEDDING_MODEL } from "../lib/images/embedding";

type Photo = { id: string; tag: string; alt: string };

async function main() {
  const library: Photo[] = JSON.parse(fs.readFileSync("lib/images/library.json", "utf8"));
  const { rows } = await pool.query<{ id: string }>("select id from library_images where embedding is not null");
  const done = new Set(rows.map((r) => r.id));
  const todo = library.filter((p) => !done.has(p.id));

  if (todo.length) {
    const { embeddings } = await embedMany({
      model: neon.embeddingModel(EMBEDDING_MODEL),
      values: todo.map((p) => `${p.tag}: ${p.alt}`),
    });
    for (const [i, p] of todo.entries()) {
      await pool.query(
        `insert into library_images (id, tag, alt, embedding) values ($1, $2, $3, $4::vector)
         on conflict (id) do update set tag = excluded.tag, alt = excluded.alt, embedding = excluded.embedding`,
        [p.id, p.tag, p.alt, JSON.stringify(embeddings[i])],
      );
    }
  }

  // BM25 learns its word statistics when the index is built, so both indexes come after the rows.
  await pool.query(
    "create index if not exists library_images_embedding_idx on library_images using lakebase_ann (embedding vector_cosine_ops)",
  );
  await pool.query(
    "create index if not exists library_images_bm25 on library_images using lakebase_bm25 (search_tsv) with (default_limit = 40)",
  );

  const { rows: [count] } = await pool.query<{ n: number; e: number }>(
    "select count(*)::int as n, count(embedding)::int as e from library_images",
  );
  console.log(`library_images: ${count.n} rows, ${count.e} with embeddings (${todo.length} embedded now)`);
  if (count.n !== library.length || count.e !== library.length) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
