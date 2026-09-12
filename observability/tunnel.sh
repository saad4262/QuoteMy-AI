#!/usr/bin/env bash
# Opens the ONE door: a public HTTPS URL that reaches the gate on this machine, and nothing else.
#
# What is exposed: http://localhost:8080 - the Caddy gate. It answers /healthz and, with the right
# X-Telemetry-Key, proxies to Alloy. Everything else on this machine, and every other container in
# this stack, stays unreachable. Grafana, Prometheus and Loki are bound to 127.0.0.1 and are not
# part of the tunnel.
#
#   ./tunnel.sh            quick tunnel - no account, random URL, changes on restart
#
# Leave it running. Ctrl-C closes the door.

set -uo pipefail
cd "$(dirname "$0")"
[ -f .env ] && set -a && . ./.env && set +a

command -v cloudflared >/dev/null || { echo "cloudflared not installed:  brew install cloudflared"; exit 1; }

curl -fsS --max-time 3 http://localhost:8080/healthz >/dev/null 2>&1 || {
  echo "The gate is not up. Start the stack first:  docker compose up -d"; exit 1; }

log=$(mktemp)
cloudflared tunnel --url http://localhost:8080 --no-autoupdate > "$log" 2>&1 &
pid=$!
trap 'kill $pid 2>/dev/null; rm -f "$log"' EXIT INT TERM

printf 'opening the tunnel'
url=""
for _ in $(seq 1 40); do
  url=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$log" | head -1) && [ -n "$url" ] && break
  printf '.'; sleep 1
done
echo

[ -z "$url" ] && { echo "could not get a URL. cloudflared said:"; tail -20 "$log"; exit 1; }

cat <<TXT

  Public URL:  $url

  Put these two in Vercel → Settings → Environment Variables (Production), then redeploy:

    TELEMETRY_URL      $url
    TELEMETRY_SECRET   ${TELEMETRY_SECRET:-<missing from .env>}

  Then check it from the outside:   ./verify-remote.sh $url

  ⚠ This URL dies when you stop this script, and a new one is issued next time. For a URL that
    stays put, see VERCEL.md - that needs a Tailscale or Cloudflare account.

  Leave this running. Ctrl-C to close.

TXT

wait $pid
