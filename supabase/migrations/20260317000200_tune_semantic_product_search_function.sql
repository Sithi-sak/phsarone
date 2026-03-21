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
      nullif(trim(lower(query_text)), '') AS normalized_query_text,
      query_embedding_text::vector(384) AS normalized_query_embedding
  ),
  query_tokens AS (
    SELECT DISTINCT token
    FROM params,
    LATERAL regexp_split_to_table(coalesce(params.normalized_query_text, ''), '\s+') AS token
    WHERE
      char_length(token) >= 3
      AND token NOT IN (
        'and', 'the', 'for', 'with', 'from', 'near', 'into', 'that',
        'this', 'your', 'have', 'has', 'are', 'new', 'used', 'cheap'
      )
  ),
  token_stats AS (
    SELECT COUNT(*)::double precision AS token_count
    FROM query_tokens
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
      END AS keyword_score,
      (
        SELECT COUNT(*)::double precision
        FROM query_tokens qt
        WHERE
          p.search_text ILIKE '%' || qt.token || '%'
          OR p.title ILIKE '%' || qt.token || '%'
      ) AS token_overlap_count
    FROM public.products p
    CROSS JOIN params
    WHERE
      p.status = 'active'
      AND p.embedding IS NOT NULL
  ),
  ranked AS (
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
      CASE
        WHEN token_stats.token_count > 0
          THEN scored.token_overlap_count / token_stats.token_count
        ELSE 0
      END AS token_overlap_ratio,
      CASE
        WHEN params.normalized_query_text IS NOT NULL
          AND scored.title ILIKE params.normalized_query_text || '%'
        THEN 1
        ELSE 0
      END AS exact_title_prefix_match
    FROM scored
    CROSS JOIN token_stats
    CROSS JOIN params
  )
  SELECT
    ranked.id,
    ranked.seller_id,
    ranked.category_id,
    ranked.title,
    ranked.description,
    ranked.price,
    ranked.images,
    ranked.location_name,
    ranked.status,
    ranked.metadata,
    ranked.created_at,
    ranked.semantic_score,
    ranked.keyword_score,
    (
      ranked.semantic_score * 0.55
      + ranked.keyword_score * 0.15
      + ranked.token_overlap_ratio * 0.25
      + ranked.exact_title_prefix_match * 0.05
    ) AS final_score
  FROM ranked
  WHERE
    ranked.semantic_score >= min_similarity
    AND (
      ranked.token_overlap_ratio > 0
      OR ranked.keyword_score >= 0.12
      OR ranked.semantic_score >= 0.72
    )
  ORDER BY final_score DESC, created_at DESC
  LIMIT GREATEST(match_count, 1);
$$;
