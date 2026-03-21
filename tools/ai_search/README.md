# AI Search Tools

Local tools for generating and backfilling semantic-search embeddings without
shipping any model weights in the mobile app.

## Step 1: create a virtual environment

```bash
cd tools/ai_search
python3 -m venv ~/.venvs/phsar_one_ai_search
source ~/.venvs/phsar_one_ai_search/bin/activate
pip install -r requirements.txt
```

## Step 2: configure environment

Create a local env file outside the repo:

```bash
mkdir -p ~/.config/phsar_one
cat > ~/.config/phsar_one/ai_search.env <<'EOF'
export EXPO_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
EOF
```

The tools read these variables from that shell env file or a root `.env` file:

- `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Use the service role key for backfill work because the script updates product
rows directly.

## Step 3: backfill embeddings

Dry run:

```bash
source ~/.venvs/phsar_one_ai_search/bin/activate
source ~/.config/phsar_one/ai_search.env
python backfill_product_embeddings.py --limit 10 --dry-run
```

Backfill missing product embeddings:

```bash
source ~/.venvs/phsar_one_ai_search/bin/activate
source ~/.config/phsar_one/ai_search.env
python backfill_product_embeddings.py --limit 50
```

Refresh all product embeddings:

```bash
source ~/.venvs/phsar_one_ai_search/bin/activate
source ~/.config/phsar_one/ai_search.env
python backfill_product_embeddings.py --refresh-all --limit 50
```

## Step 4: test semantic search

```bash
source ~/.venvs/phsar_one_ai_search/bin/activate
source ~/.config/phsar_one/ai_search.env
python semantic_search_products.py "cheap laptop for school"
python semantic_search_products.py "bmw car"
python semantic_search_products.py "shampoo from china"
```

## Step 5: run the local AI API manually

```bash
source ~/.venvs/phsar_one_ai_search/bin/activate
source ~/.config/phsar_one/ai_search.env
uvicorn api_server:app --host 0.0.0.0 --port 8000
```

## Step 6: run local AI API + auto-embedding worker together

```bash
bash tools/ai_search/start_local_ai.sh
```

This starts:

- `uvicorn api_server:app`
- `python sync_product_embeddings.py`

The sync worker watches for products whose embeddings were cleared after create
or edit and fills them back in automatically.

Endpoints:

- `GET /health`
- `GET /semantic-search?q=cheap%20laptop%20for%20school`
- `GET /recommendations?user_id=<clerk_user_id>`

## Notes

- Model: `BAAI/bge-small-en-v1.5`
- Embedding size: `384`
- The model is cached locally by Hugging Face; it is not stored in this repo.
- If you close the local AI processes, existing embeddings remain in Supabase,
  but new/edited products will not be re-embedded until you restart the worker.
- This step only handles products. Trades can be added after the product search
  path is working end to end.
