CREATE EXTENSION IF NOT EXISTS lakebase_vector CASCADE;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS lakebase_text CASCADE;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS library_images (
  id text PRIMARY KEY,
  tag text NOT NULL,
  alt text NOT NULL,
  embedding vector(1024),
  search_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', tag || ' ' || alt)) STORED
);
