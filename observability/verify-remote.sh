#!/usr/bin/env bash
# Is the door open, is it locked, and is the deployed backend actually coming through it?
#
#   ./verify-remote.sh https://your-tunnel-host
#
# The last check is the one that matters. Everything before it can pass while Vercel still has the
# wrong URL, the wrong secret, or has not been redeployed since you set them.

set -uo pipefail
cd "$(dirname "$0")"
# shellcheck disable=SC1091
[ -f .env ] && set -a && . ./.env && set +a

URL="${1:-}"
[ -z "$URL" ] && { echo "usage: ./verify-remote.sh https://your-tunnel-host"; exit 1; }
URL="${URL%/}"

pass=0; fail=0
ok()  { printf '  \033[32mok\033[0m    %s\n' "$1"; pass=$((pass+1)); }
bad() { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fail=$((fail+1)); }

echo
echo "the door"
body=$(curl -fsS --max-time 10 "$URL/healthz" 2>/dev/null)
[ "$body" = "ok" ] && ok "reachable from the public internet" || bad "cannot reach $URL/healthz"

code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -XPOST "$URL/loki/api/v1/push" -d '{}' 2>/dev/null)
[ "$code" = "401" ] && ok "locked without the key ($code)" || bad "no key returned $code, expected 401"

echo
echo "a push from outside"
marker="remote-$(date +%s)-$RANDOM"
ns=$(( $(date +%s) * 1000000000 ))
line="{\\\"level\\\":30,\\\"time\\\":$(date +%s)000,\\\"msg\\\":\\\"$marker\\\"}"
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -XPOST "$URL/loki/api/v1/push" \
  -H "X-Telemetry-Key: ${TELEMETRY_SECRET:-}" -H 'Content-Type: application/json' \
  -d "{\"streams\":[{\"stream\":{\"service\":\"quotemy-api\",\"env\":\"remote-check\"},\"values\":[[\"$ns\",\"$line\"]]}]}" 2>/dev/null)
case "$code" in 20*) ok "accepted with the key ($code)" ;; *) bad "rejected with the key ($code)" ;; esac

found=0
for _ in $(seq 1 12); do
  sleep 1
  found=$(curl -fsS --max-time 5 -G http://localhost:3100/loki/api/v1/query_range \
    --data-urlencode 'query={service="quotemy-api", env="remote-check"}' \
    --data-urlencode "start=$(( $(date +%s) - 300 ))000000000" 2>/dev/null | grep -c "$marker" || true)
  [ "${found:-0}" != "0" ] && break
done
[ "${found:-0}" != "0" ] && ok "arrived in Loki, having gone out to the internet and back" \
                         || bad "never reached Loki"

echo
echo "the deployed backend"
# `production` is what VERCEL_ENV is on a production deployment - see telemetry.ts.
lines=$(curl -fsS --max-time 8 -G http://localhost:3100/loki/api/v1/query_range \
  --data-urlencode 'query=sum(count_over_time({service="quotemy-api", env="production"} [1h]))' \
  --data-urlencode "start=$(( $(date +%s) - 3600 ))000000000" 2>/dev/null \
  | grep -oE '"[0-9]+\.?[0-9]*"\]' | tail -1 | tr -d '"]' || echo 0)

if [ -n "$lines" ] && [ "${lines%%.*}" -gt 0 ] 2>/dev/null; then
  ok "$(printf '%.0f' "$lines") lines from Vercel in the last hour"
else
  bad "nothing from Vercel yet"
  cat <<'HINT'
        Not necessarily broken - work through these in order:
          1. Are TELEMETRY_URL and TELEMETRY_SECRET set in Vercel, for Production?
          2. Has it been REDEPLOYED since? Environment variables only reach a NEW deployment.
          3. Has anyone hit the deployed API since that deploy? No traffic, no lines.
HINT
fi

echo
[ "$fail" -eq 0 ] && printf '\033[32m%d passed.\033[0m Vercel is reporting to this machine.\n\n' "$pass" \
                  || printf '\033[31m%d failed\033[0m, %d passed.\n\n' "$fail" "$pass"
exit "$fail"
