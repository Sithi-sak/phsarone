#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from supabase import Client, create_client

MODEL_NAME = "BAAI/bge-small-en-v1.5"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run semantic product search against Supabase.",
    )
    parser.add_argument("query", help="Natural-language search query.")
    parser.add_argument(
        "--limit",
        type=int,
        default=8,
        help="Number of search results to return.",
    )
    parser.add_argument(
        "--min-similarity",
        type=float,
        default=0.45,
        help="Minimum semantic similarity score.",
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


def vector_to_literal(values: list[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in values) + "]"


def main() -> None:
    args = build_parser().parse_args()
    client = create_supabase_client()

    print(f"Loading embedding model: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)

    print(f'Encoding query: "{args.query}"')
    query_embedding = model.encode(args.query, normalize_embeddings=True)
    query_embedding_literal = vector_to_literal(
      [float(value) for value in query_embedding.tolist()]
    )

    response = client.rpc(
        "semantic_search_products",
        {
            "query_text": args.query,
            "query_embedding_text": query_embedding_literal,
            "match_count": args.limit,
            "min_similarity": args.min_similarity,
        },
    ).execute()

    results = list(response.data or [])
    if not results:
        print("No products matched the semantic search criteria.")
        return

    print(f"Found {len(results)} result(s):")
    for index, row in enumerate(results, start=1):
        title = row.get("title") or "Untitled"
        semantic_score = float(row.get("semantic_score") or 0)
        keyword_score = float(row.get("keyword_score") or 0)
        final_score = float(row.get("final_score") or 0)
        location = row.get("location_name") or "-"
        print(
            f"{index}. {title} | semantic={semantic_score:.3f} | "
            f"keyword={keyword_score:.3f} | final={final_score:.3f} | "
            f"location={location}",
        )


if __name__ == "__main__":
    main()
