#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
VENV_PATH="${AI_SEARCH_VENV_PATH:-$HOME/.venvs/phsar_one_ai_search}"
ENV_FILE="${AI_SEARCH_ENV_FILE:-$HOME/.config/phsar_one/ai_search.env}"
API_HOST="${AI_SEARCH_API_HOST:-0.0.0.0}"
API_PORT="${AI_SEARCH_API_PORT:-8000}"
SYNC_INTERVAL="${AI_SEARCH_SYNC_INTERVAL_SECONDS:-20}"
SYNC_LIMIT="${AI_SEARCH_SYNC_LIMIT:-25}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing env file: ${ENV_FILE}"
  echo "Create it with EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY exports."
  exit 1
fi

if [[ ! -x "${VENV_PATH}/bin/python" ]]; then
  echo "Missing virtualenv at: ${VENV_PATH}"
  echo "Create it first, then install tools/ai_search/requirements.txt."
  exit 1
fi

source "${ENV_FILE}"
source "${VENV_PATH}/bin/activate"
cd "${SCRIPT_DIR}"

cleanup() {
  if [[ -n "${API_PID:-}" ]]; then
    kill "${API_PID}" 2>/dev/null || true
  fi
  if [[ -n "${SYNC_PID:-}" ]]; then
    kill "${SYNC_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting AI API on ${API_HOST}:${API_PORT}"
uvicorn api_server:app --host "${API_HOST}" --port "${API_PORT}" &
API_PID=$!

echo "Starting embedding sync worker (interval=${SYNC_INTERVAL}s, limit=${SYNC_LIMIT})"
python sync_product_embeddings.py --interval-seconds "${SYNC_INTERVAL}" --limit "${SYNC_LIMIT}" &
SYNC_PID=$!

echo "AI services are running."
echo "API PID: ${API_PID}"
echo "Sync PID: ${SYNC_PID}"
echo "Press Ctrl+C to stop both."

wait -n "${API_PID}" "${SYNC_PID}"
