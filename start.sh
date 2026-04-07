#!/usr/bin/env bash
set -e

LLAMA_SERVER="$HOME/bin/llama-b8681/llama-server"
MODEL_PATH="$HOME/models/gemma-4-E2B-it-UD-Q8_K_XL.gguf"
LLAMA_PORT=8080
LLAMA_LOG="/tmp/llama-server.log"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Parse flags ---
REDEPLOY=false
for arg in "$@"; do
  case "$arg" in
    --redeploy|-r) REDEPLOY=true ;;
  esac
done

# --- Redeploy: pull latest changes and restart app processes ---
if [ "$REDEPLOY" = true ]; then
  echo "[redeploy] Pulling latest changes..."
  git -C "$SCRIPT_DIR" pull

  echo "[redeploy] Installing dependencies..."
  eval "$(fnm env --use-on-cd 2>/dev/null)" || true
  fnm use 22 2>/dev/null || true
  npm install --prefix "$SCRIPT_DIR"

  echo "[redeploy] Stopping existing app processes..."
  pkill -f "tsx watch src/index.ts" 2>/dev/null || true
  pkill -f "vite --config.*apps/web" 2>/dev/null || true
  pkill -f "vite.*apps/web/vite.config.ts" 2>/dev/null || true
  sleep 1
  echo "[redeploy] Done. Restarting..."
fi

# --- Check model file ---
if [ ! -f "$MODEL_PATH" ]; then
  echo "ERROR: Model not found at $MODEL_PATH"
  echo "       Run: python3 -c \"from huggingface_hub import hf_hub_download; hf_hub_download('unsloth/gemma-4-E2B-it-GGUF', 'gemma-4-E2B-it-UD-Q8_K_XL.gguf', local_dir='\$HOME/models')\""
  exit 1
fi

# --- Start llama-server if not running ---
if curl -sf "http://127.0.0.1:${LLAMA_PORT}/health" >/dev/null 2>&1; then
  echo "[llama-server] already running on port ${LLAMA_PORT}"
else
  echo "[llama-server] starting with Vulkan (GPU offload)..."
  LD_LIBRARY_PATH="$HOME/bin/llama-b8681:${LD_LIBRARY_PATH}" \
    "$LLAMA_SERVER" \
      --model "$MODEL_PATH" \
      --host 127.0.0.1 \
      --port "$LLAMA_PORT" \
      --ctx-size 8192 \
      --n-gpu-layers 99 \
      --flash-attn on \
      --parallel 2 \
      --log-file "$LLAMA_LOG" \
    &
  LLAMA_PID=$!
  echo "[llama-server] PID $LLAMA_PID — waiting for readiness..."
  for i in $(seq 1 30); do
    sleep 1
    if curl -sf "http://127.0.0.1:${LLAMA_PORT}/health" >/dev/null 2>&1; then
      echo "[llama-server] ready"
      break
    fi
    if ! kill -0 $LLAMA_PID 2>/dev/null; then
      echo "[llama-server] crashed — check $LLAMA_LOG"
      exit 1
    fi
    echo -n "."
  done
fi

# --- Start asclepios backend ---
cd "$SCRIPT_DIR"
echo "[asclepios] starting server..."
eval "$(fnm env --use-on-cd 2>/dev/null)" || true
fnm use 22 2>/dev/null || true
unset HOST
npm run dev > /tmp/asclepios-server.log 2>&1 &
SERVER_PID=$!
echo "[asclepios] server PID $SERVER_PID"

# --- Start web UI ---
echo "[asclepios] starting web UI on :5173..."
"$SCRIPT_DIR/node_modules/.bin/vite" \
  --config "$SCRIPT_DIR/apps/web/vite.config.ts" \
  > /tmp/asclepios-web.log 2>&1 &
WEB_PID=$!
echo "[asclepios] web PID $WEB_PID"

echo ""
echo "  API:    http://127.0.0.1:8787/api"
echo "  Web UI: http://$(hostname -I | awk '{print $1}'):5173"
echo ""
echo "  Logs:   /tmp/asclepios-server.log  /tmp/asclepios-web.log"
echo ""
echo "  To redeploy after changes: ./start.sh --redeploy"
echo ""

trap "echo 'Shutting down...'; kill $SERVER_PID $WEB_PID 2>/dev/null; exit 0" INT TERM

wait $SERVER_PID
