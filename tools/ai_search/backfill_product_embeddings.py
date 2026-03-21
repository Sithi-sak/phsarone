#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from supabase import Client, create_client

MODEL_NAME = "BAAI/bge-small-en-v1.5"
EMBEDDING_DIMENSION = 384


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Backfill semantic-search embeddings for product listings.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=50,
        help="Maximum number of products to process in one run.",
    )
    parser.add_argument(
        "--refresh-all",
        action="store_true",
        help="Regenerate embeddings even when a row already has one.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview which rows would be updated without writing to Supabase.",
    )
    return parser


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def create_supabase_client() -> Client:
    load_dotenv()
    load_dotenv("../../.env")
    url = require_env("EXPO_PUBLIC_SUPABASE_URL")
    service_role_key = require_env("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, service_role_key)


def normalize_text(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def build_fallback_search_text(product: dict[str, Any]) -> str:
    metadata = product.get("metadata") or {}
    parts = [
        normalize_text(product.get("title")),
        normalize_text(product.get("description")),
        normalize_text(product.get("location_name")),
        normalize_text(metadata.get("brand")),
        normalize_text(metadata.get("condition")),
        normalize_text(metadata.get("district")),
        normalize_text(metadata.get("commune")),
        normalize_text(metadata.get("subCategory")),
        normalize_text(metadata.get("province")),
    ]
    return " ".join(part for part in parts if part).strip()


def fetch_products(client: Client, limit: int, refresh_all: bool) -> list[dict[str, Any]]:
    query = (
        client.table("products")
        .select("id, search_text, title, description, location_name, metadata, embedding")
        .order("updated_at", desc=True)
        .limit(limit)
    )

    if not refresh_all:
        query = query.is_("embedding", "null")

    response = query.execute()
    return list(response.data or [])


def embed_products(model: SentenceTransformer, products: list[dict[str, Any]]) -> list[tuple[str, list[float], str]]:
    documents: list[str] = []
    product_ids: list[str] = []

    for product in products:
        search_text = normalize_text(product.get("search_text"))
        if not search_text:
            search_text = build_fallback_search_text(product)
        if not search_text:
            continue
        product_ids.append(str(product["id"]))
        documents.append(search_text)

    if not documents:
        return []

    embeddings = model.encode(
        documents,
        normalize_embeddings=True,
        show_progress_bar=len(documents) > 10,
    )

    results: list[tuple[str, list[float], str]] = []
    for product_id, document, embedding in zip(product_ids, documents, embeddings):
        vector = [float(value) for value in embedding.tolist()]
        if len(vector) != EMBEDDING_DIMENSION:
            raise RuntimeError(
                f"Unexpected embedding length for {product_id}: {len(vector)}",
            )
        results.append((product_id, vector, document))
    return results


def run_backfill_once(
    client: Client,
    model: SentenceTransformer,
    *,
    limit: int,
    refresh_all: bool,
    dry_run: bool,
) -> int:
    products = fetch_products(client, limit, refresh_all)
    if not products:
        print("No product rows matched the current backfill criteria.")
        return 0

    embedded = embed_products(model, products)
    if not embedded:
        print("No eligible products had searchable text to embed.")
        return 0

    print(f"Prepared {len(embedded)} product embeddings.")
    for product_id, _, document in embedded:
        print(f"- {product_id}: {document[:120]}")

    if dry_run:
        print("Dry run complete. No updates were written.")
        return len(embedded)

    updated_at = datetime.now(timezone.utc).isoformat()

    for index, (product_id, embedding, _) in enumerate(embedded, start=1):
        client.table("products").update(
            {
                "embedding": embedding,
                "embedding_model": MODEL_NAME,
                "embedding_updated_at": updated_at,
            }
        ).eq("id", product_id).execute()
        print(f"[{index}/{len(embedded)}] Updated {product_id}")

    print("Embedding backfill complete.")
    return len(embedded)


def main() -> None:
    args = build_parser().parse_args()
    client = create_supabase_client()

    print(f"Loading embedding model: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)

    run_backfill_once(
        client,
        model,
        limit=args.limit,
        refresh_all=args.refresh_all,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    main()
