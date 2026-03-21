#!/usr/bin/env python3
from __future__ import annotations

import os
from datetime import datetime
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from sentence_transformers import SentenceTransformer
from supabase import Client, create_client

MODEL_NAME = "BAAI/bge-small-en-v1.5"

app = FastAPI(title="PhsarOne AI Search API", version="0.1.0")

_model: SentenceTransformer | None = None
_supabase: Client | None = None


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        load_dotenv()
        load_dotenv("../../.env")
        _supabase = create_client(
            require_env("EXPO_PUBLIC_SUPABASE_URL"),
            require_env("SUPABASE_SERVICE_ROLE_KEY"),
        )
    return _supabase


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        print(f"Loading embedding model: {MODEL_NAME}")
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def vector_to_literal(values: list[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in values) + "]"


def encode_text(text: str) -> str:
    model = get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return vector_to_literal([float(value) for value in embedding.tolist()])


def normalize_embedding(raw_embedding: Any) -> list[float] | None:
    if raw_embedding is None:
        return None

    if isinstance(raw_embedding, str):
        normalized = raw_embedding.strip().removeprefix("[").removesuffix("]")
        if not normalized:
            return None
        return [float(value.strip()) for value in normalized.split(",") if value.strip()]

    if isinstance(raw_embedding, (list, tuple)):
        return [float(value) for value in raw_embedding]

    return None


def average_embeddings(rows: list[dict[str, Any]]) -> str | None:
    vectors: list[list[float]] = []
    for row in rows:
        embedding = normalize_embedding(row.get("embedding"))
        if embedding:
            vectors.append(embedding)

    if not vectors:
        return None

    dimension = len(vectors[0])
    sums = [0.0] * dimension
    for vector in vectors:
        for index, value in enumerate(vector):
            sums[index] += value

    averaged = [value / len(vectors) for value in sums]
    return vector_to_literal(averaged)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": MODEL_NAME, "time": datetime.utcnow().isoformat()}


@app.get("/semantic-search")
def semantic_search(
    q: str = Query(..., min_length=2),
    limit: int = Query(8, ge=1, le=24),
    min_similarity: float = Query(0.45, ge=0.0, le=1.0),
) -> dict[str, Any]:
    try:
        query_embedding_literal = encode_text(q)
        response = get_supabase().rpc(
            "semantic_search_products",
            {
                "query_text": q,
                "query_embedding_text": query_embedding_literal,
                "match_count": limit,
                "min_similarity": min_similarity,
            },
        ).execute()
        return {"query": q, "results": list(response.data or [])}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/recommendations")
def recommendations(
    user_id: str = Query(..., min_length=2),
    limit: int = Query(8, ge=1, le=24),
    min_similarity: float = Query(0.45, ge=0.0, le=1.0),
) -> dict[str, Any]:
    supabase = get_supabase()

    try:
        favorite_rows = supabase.table("favorites").select("product_id, created_at").eq(
            "user_id",
            user_id,
        ).not_.is_("product_id", "null").order("created_at", desc=True).limit(5).execute()

        history_rows = supabase.table("view_history").select("product_id, viewed_at").eq(
            "user_id",
            user_id,
        ).not_.is_("product_id", "null").order("viewed_at", desc=True).limit(8).execute()

        seed_ids = []
        for row in list(favorite_rows.data or []) + list(history_rows.data or []):
            product_id = row.get("product_id")
            if product_id and product_id not in seed_ids:
                seed_ids.append(product_id)

        if not seed_ids:
            fallback = supabase.table("products").select("id").eq(
                "status",
                "active",
            ).order("created_at", desc=True).limit(limit).execute()
            return {
                "user_id": user_id,
                "results": [{"id": row["id"], "semantic_score": 0.0} for row in list(fallback.data or [])],
                "mode": "fallback_recent",
            }

        seed_products = supabase.table("products").select(
            "id, embedding"
        ).in_("id", seed_ids).not_.is_("embedding", "null").execute()

        averaged_embedding = average_embeddings(list(seed_products.data or []))
        if not averaged_embedding:
            fallback = supabase.table("products").select("id").eq(
                "status",
                "active",
            ).order("created_at", desc=True).limit(limit).execute()
            return {
                "user_id": user_id,
                "results": [{"id": row["id"], "semantic_score": 0.0} for row in list(fallback.data or [])],
                "mode": "fallback_recent",
            }

        matched = supabase.rpc(
            "match_products_by_embedding",
            {
                "query_embedding_text": averaged_embedding,
                "match_count": limit,
                "min_similarity": min_similarity,
                "exclude_product_ids": seed_ids,
                "exclude_seller_id": user_id,
            },
        ).execute()

        return {
            "user_id": user_id,
            "results": list(matched.data or []),
            "mode": "personalized_embedding",
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
