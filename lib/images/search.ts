import "server-only";
import { neon } from "@neon/ai-sdk-provider";
import { embed } from "ai";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { EMBEDDING_MODEL } from "./embedding";
import { findImages, getImageById, listImages, type ImageTag, type LibraryImage } from "./library";

/** The library when search can't answer: the tag's photos, or the first `count` photos of the library. */
function fallback(tag: ImageTag | undefined, count: number): LibraryImage[] {
  return tag ? findImages(tag, count) : listImages().slice(0, count).map(({ id, src, alt }) => ({ id, src, alt }));
}

/**
 * The one door to photo search (Lakebase Search): vector search on the description's embedding and BM25 keyword
 * search on its words, merged with reciprocal rank fusion. Never throws: a failure or no match falls back to the
 * library, so a build never stops for a photo.
 */
export async function searchImages(
  description: string,
  { tag, count = 6 }: { tag?: ImageTag; count?: number } = {},
): Promise<LibraryImage[]> {
  try {
    const { embedding } = await embed({ model: neon.embeddingModel(EMBEDDING_MODEL), value: description });
    const vector = JSON.stringify(embedding);
    const tagValue = tag ?? null;
    const { rows } = await db.execute<{ id: string }>(sql`
      WITH vector_ranked AS (
        SELECT id, RANK() OVER (ORDER BY dist) AS rank FROM (
          SELECT id, embedding <=> ${vector}::vector AS dist FROM library_images
          WHERE embedding IS NOT NULL AND (${tagValue}::text IS NULL OR tag = ${tagValue}::text)
          ORDER BY dist LIMIT 40
        ) v
      ),
      keyword_ranked AS (
        SELECT id, RANK() OVER (ORDER BY score) AS rank FROM (
          SELECT id, score FROM (
            SELECT id, search_tsv <@> to_bm25query(to_tsvector('english', ${description}), 'library_images_bm25') AS score
            FROM library_images WHERE (${tagValue}::text IS NULL OR tag = ${tagValue}::text)
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
    const images = rows.map((r) => getImageById(r.id)).filter((i): i is LibraryImage => !!i);
    if (images.length) return images;
    console.warn("searchImages: no match, using the library");
  } catch (error) {
    console.warn(`searchImages: search failed, using the library (${error instanceof Error ? error.message : error})`);
  }
  return fallback(tag, count);
}
