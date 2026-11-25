import "server-only";
import { neon } from "@neon/ai-sdk-provider";
import { embed } from "ai";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { EMBEDDING_MODEL } from "./embedding";
import { findImages, getImageById, type ImageTag, type LibraryImage } from "./library";

// The one door to photo search (Lakebase Search): a vector search on the meaning of the description and a BM25
// keyword search on its words, both over library_images, merged with reciprocal rank fusion. If the gateway or the
// query fails, or nothing matches, it falls back to the library order, so a build never stops for a photo.
export async function searchImages(description: string, { tag, count = 6 }: { tag?: ImageTag; count?: number } = {}): Promise<LibraryImage[]> {
  try {
    const { embedding } = await embed({ model: neon.embeddingModel(EMBEDDING_MODEL), value: description });
    const vector = JSON.stringify(embedding);
    const t = tag ?? null;
    const { rows } = await db.execute<{ id: string }>(sql`
      WITH vector_ranked AS (
        SELECT id, RANK() OVER (ORDER BY dist) AS rank FROM (
          SELECT id, embedding <=> ${vector}::vector AS dist FROM library_images
          WHERE embedding IS NOT NULL AND (${t}::text IS NULL OR tag = ${t}::text)
          ORDER BY dist LIMIT 40
        ) v
      ),
      keyword_ranked AS (
        SELECT id, RANK() OVER (ORDER BY score) AS rank FROM (
          SELECT id, score FROM (
            SELECT id, search_tsv <@> to_bm25query(to_tsvector('english', ${description}), 'library_images_bm25') AS score
            FROM library_images WHERE (${t}::text IS NULL OR tag = ${t}::text)
          ) s WHERE score < 0 ORDER BY score, id LIMIT 40
        ) k
      )
      SELECT l.id FROM library_images l
      LEFT JOIN vector_ranked v ON v.id = l.id
      LEFT JOIN keyword_ranked k ON k.id = l.id
      WHERE v.id IS NOT NULL OR k.id IS NOT NULL
      ORDER BY COALESCE(1.0 / (60 + v.rank), 0) + COALESCE(1.0 / (60 + k.rank), 0) DESC, l.id
      LIMIT ${count}
    `);
    const images = rows.map((r) => getImageById(r.id)).filter((img): img is LibraryImage => !!img);
    if (images.length) return images;
    console.warn(`searchImages: no match for "${description}", using the library order`);
  } catch (err) {
    console.warn("searchImages failed, using the library order:", err instanceof Error ? err.message : err);
  }
  return findImages(tag, count);
}
