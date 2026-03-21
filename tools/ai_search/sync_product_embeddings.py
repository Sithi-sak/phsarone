#!/usr/bin/env python3
from __future__ import annotations

import argparse
import time

from sentence_transformers import SentenceTransformer

from backfill_product_embeddings import (
    MODEL_NAME,
    create_supabase_client,
    run_backfill_once,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Continuously sync missing product embeddings.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=25,
        help="Maximum number of products to process in one pass.",
    )
    parser.add_argument(
        "--interval-seconds",
        type=int,
        default=20,
        help="Delay between polling cycles.",
    )
    parser.add_argument(
        "--run-once",
        action="store_true",
        help="Process one pass and exit.",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    client = create_supabase_client()

    print(f"Loading embedding model: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)
    print(
        "Embedding sync worker started "
        f"(limit={args.limit}, interval={args.interval_seconds}s).",
    )

    while True:
        updated = run_backfill_once(
            client,
            model,
            limit=args.limit,
            refresh_all=False,
            dry_run=False,
        )
        if args.run_once:
            return

        if updated == 0:
            print(
                f"No pending product embeddings found. Sleeping for {args.interval_seconds}s.",
            )
        else:
            print(
                f"Processed {updated} product embedding(s). Sleeping for {args.interval_seconds}s.",
            )
        time.sleep(args.interval_seconds)


if __name__ == "__main__":
    main()
