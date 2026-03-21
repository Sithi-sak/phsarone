CREATE OR REPLACE FUNCTION public.match_products_by_embedding(
  query_embedding_text text,
  match_count integer DEFAULT 20,
  min_similarity double precision DEFAULT 0.45,
  exclude_product_ids uuid[] DEFAULT ARRAY[]::uuid[],
  exclude_seller_id text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  semantic_score double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    1 - (p.embedding <=> query_embedding_text::vector(384)) AS semantic_score
  FROM public.products p
  WHERE
    p.status = 'active'
    AND p.embedding IS NOT NULL
    AND (exclude_seller_id IS NULL OR p.seller_id <> exclude_seller_id)
    AND NOT (p.id = ANY(exclude_product_ids))
    AND 1 - (p.embedding <=> query_embedding_text::vector(384)) >= min_similarity
  ORDER BY semantic_score DESC, p.created_at DESC
  LIMIT GREATEST(match_count, 1);
$$;
