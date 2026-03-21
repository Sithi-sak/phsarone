CREATE OR REPLACE FUNCTION public.semantic_search_products(
  query_text text,
  query_embedding_text text,
  match_count integer DEFAULT 20,
  min_similarity double precision DEFAULT 0.45
)
RETURNS TABLE (
  id uuid,
  seller_id text,
  category_id uuid,
  title text,
  description text,
  price numeric,
  images text[],
  location_name text,
  status text,
  metadata jsonb,
  created_at timestamptz,
  semantic_score double precision,
  keyword_score double precision,
  final_score double precision
)
LANGUAGE sql
STABLE
AS $$
  WITH params AS (
    SELECT
      nullif(trim(query_text), '') AS normalized_query_text,
      query_embedding_text::vector(384) AS normalized_query_embedding
  ),
  scored AS (
    SELECT
      p.id,
      p.seller_id,
      p.category_id,
      p.title,
      p.description,
      p.price,
      p.images,
      p.location_name,
      p.status,
      p.metadata,
      p.created_at,
      1 - (p.embedding <=> params.normalized_query_embedding) AS semantic_score,
      CASE
        WHEN params.normalized_query_text IS NULL THEN 0
        ELSE GREATEST(
          similarity(p.search_text, params.normalized_query_text),
          similarity(p.title, params.normalized_query_text)
        )
      END AS keyword_score
    FROM public.products p
    CROSS JOIN params
    WHERE
      p.status = 'active'
      AND p.embedding IS NOT NULL
  )
  SELECT
    scored.id,
    scored.seller_id,
    scored.category_id,
    scored.title,
    scored.description,
    scored.price,
    scored.images,
    scored.location_name,
    scored.status,
    scored.metadata,
    scored.created_at,
    scored.semantic_score,
    scored.keyword_score,
    (scored.semantic_score * 0.75) + (scored.keyword_score * 0.25) AS final_score
  FROM scored
  WHERE scored.semantic_score >= min_similarity
  ORDER BY final_score DESC, created_at DESC
  LIMIT GREATEST(match_count, 1);
$$;
