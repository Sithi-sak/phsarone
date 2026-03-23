#!/usr/bin/env python3
from __future__ import annotations

import io
import os
from datetime import datetime
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from PIL import Image
from sentence_transformers import SentenceTransformer
from supabase import Client, create_client
from transformers import pipeline

MODEL_NAME = "BAAI/bge-small-en-v1.5"
IMAGE_MODEL_NAME = "openai/clip-vit-base-patch32"

app = FastAPI(title="PhsarOne AI Search API", version="0.1.0")

_model: SentenceTransformer | None = None
_supabase: Client | None = None
_image_moderation_pipeline: Any | None = None


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


def get_image_moderation_pipeline():
    global _image_moderation_pipeline
    if _image_moderation_pipeline is None:
        print(f"Loading image moderation model: {IMAGE_MODEL_NAME}")
        _image_moderation_pipeline = pipeline(
            "zero-shot-image-classification",
            model=IMAGE_MODEL_NAME,
        )
    return _image_moderation_pipeline


def prepare_image_for_classification(image: Image.Image) -> Image.Image:
    image = image.convert("RGB")
    max_dim = 384
    width, height = image.size
    if max(width, height) <= max_dim:
      return image

    if width >= height:
      new_width = max_dim
      new_height = max(1, round((height / width) * max_dim))
    else:
      new_height = max_dim
      new_width = max(1, round((width / height) * max_dim))

    return image.resize((new_width, new_height))


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


def build_recent_fallback_results(
    supabase: Client,
    limit: int,
    user_id: str | None = None,
    mode: str = "fallback_recent",
) -> dict[str, Any]:
    fallback = (
        supabase.table("products")
        .select("id")
        .eq("status", "active")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {
        "user_id": user_id,
        "results": [
            {"id": row["id"], "semantic_score": 0.0}
            for row in list(fallback.data or [])
        ],
        "mode": mode,
    }


def score_labels(image: Image.Image, labels: list[str]) -> dict[str, float]:
    classifier = get_image_moderation_pipeline()
    results = classifier(image, candidate_labels=labels)
    return {
        item["label"]: float(item["score"])
        for item in list(results or [])
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": MODEL_NAME, "time": datetime.utcnow().isoformat()}


@app.post("/moderate-image")
async def moderate_image(file: UploadFile = File(...)) -> dict[str, Any]:
    try:
        raw = await file.read()
        image = prepare_image_for_classification(Image.open(io.BytesIO(raw)))
        danger_scores = score_labels(
            image,
            [
                "safe consumer product",
                "toy blaster or toy gun",
                "water gun toy",
                "foam dart toy",
                "gun or firearm",
                "knife weapon",
                "bomb or explosive",
            ],
        )

        danger_score = max(
            danger_scores.get("gun or firearm", 0.0),
            danger_scores.get("knife weapon", 0.0),
            danger_scores.get("bomb or explosive", 0.0),
        )
        toy_score = max(
            danger_scores.get("toy blaster or toy gun", 0.0),
            danger_scores.get("water gun toy", 0.0),
            danger_scores.get("foam dart toy", 0.0),
        )
        safe_product_score = danger_scores.get("safe consumer product", 0.0)

        reasons: list[str] = []
        decision = "allow"

        if (
            danger_score >= 0.3
            and toy_score < 0.22
            and (danger_score - max(toy_score, safe_product_score)) >= 0.08
        ):
            reasons.append("dangerous item")
            decision = "block"

        if (
            decision == "allow"
            and danger_score >= 0.18
            and toy_score < danger_score
        ):
            decision = "review"
            if danger_score >= 0.18:
                reasons.append("possible dangerous item")

        return {
            "decision": decision,
            "reasons": reasons,
            "scores": {
                "dangerous_item": danger_score,
                "toy_item": toy_score,
                "safe_product": safe_product_score,
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


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
            return build_recent_fallback_results(
                supabase,
                limit,
                user_id=user_id,
                mode="fallback_recent",
            )

        seed_products = supabase.table("products").select(
            "id, embedding"
        ).in_("id", seed_ids).not_.is_("embedding", "null").execute()

        averaged_embedding = average_embeddings(list(seed_products.data or []))
        if not averaged_embedding:
            return build_recent_fallback_results(
                supabase,
                limit,
                user_id=user_id,
                mode="fallback_recent",
            )

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
        print(f"Recommendations fallback warning: {exc}")
        return build_recent_fallback_results(
            supabase,
            limit,
            user_id=user_id,
            mode="fallback_recent_error",
        )
