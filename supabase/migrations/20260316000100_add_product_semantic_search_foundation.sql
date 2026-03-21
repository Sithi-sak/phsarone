CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS search_text text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_model text,
ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.build_product_search_text(
  p_title text,
  p_description text,
  p_location_name text,
  p_metadata jsonb
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(
    concat_ws(
      ' ',
      coalesce(p_title, ''),
      coalesce(p_description, ''),
      coalesce(p_location_name, ''),
      coalesce(p_metadata ->> 'brand', ''),
      coalesce(p_metadata ->> 'condition', ''),
      coalesce(p_metadata ->> 'district', ''),
      coalesce(p_metadata ->> 'commune', ''),
      coalesce(p_metadata ->> 'subCategory', ''),
      coalesce(p_metadata ->> 'province', '')
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.sync_product_search_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  next_search_text text;
BEGIN
  next_search_text := public.build_product_search_text(
    NEW.title,
    NEW.description,
    NEW.location_name,
    COALESCE(NEW.metadata, '{}'::jsonb)
  );

  IF TG_OP = 'INSERT' THEN
    NEW.search_text := next_search_text;
    RETURN NEW;
  END IF;

  IF
    NEW.title IS DISTINCT FROM OLD.title OR
    NEW.description IS DISTINCT FROM OLD.description OR
    NEW.location_name IS DISTINCT FROM OLD.location_name OR
    NEW.metadata IS DISTINCT FROM OLD.metadata
  THEN
    NEW.search_text := next_search_text;
    NEW.embedding := NULL;
    NEW.embedding_model := NULL;
    NEW.embedding_updated_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_products_search_fields_synced ON public.products;
CREATE TRIGGER on_products_search_fields_synced
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE PROCEDURE public.sync_product_search_fields();

UPDATE public.products
SET
  search_text = public.build_product_search_text(
    title,
    description,
    location_name,
    COALESCE(metadata, '{}'::jsonb)
  ),
  embedding = NULL,
  embedding_model = NULL,
  embedding_updated_at = NULL
WHERE TRUE;

CREATE INDEX IF NOT EXISTS idx_products_search_text_trgm
ON public.products
USING gin (search_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_embedding_cosine
ON public.products
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
