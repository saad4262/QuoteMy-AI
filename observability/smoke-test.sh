#!/usr/bin/env bash
# Phase 0 acceptance test: is the pipe actually joined up, end to end?
#
# Pushes one fake log line in the front door and reads it back out of Loki. Everything else here
# is a service saying it is alive; this is the only check that proves the parts are connected.
#
#   ./smoke-test.sh

set -uo pipefail
cd "$(dirname "$0")"

# shellcheck disable=SC1091
[ -f .env ] && set -a && . ./.env && set +a

pass=0; fail=0
ok()   { printf '  \033[32mok\033[0m    %s\n' "$1"; pass=$((pass+1)); }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fail=$((fail+1)); }

# Retries, because "not up yet" and "broken" look identical if you only ask once - and running
# this straight after `docker compose up -d` always catches Loki inside its 15-second readiness
# grace period. Asking once reported a healthy stack as broken.
check() { # name, url, expected-substring
  local body i
  for i in $(seq 1 45); do
    body=$(curl -fsS --max-time 3 "$2" 2>/dev/null)
    if [ -n "$body" ] && printf '%s' "$body" | grep -q "$3"; then ok "$1"; return; fi
    sleep 1
  done
  bad "$1  ($2)  last response: ${body:-<none>}"
}

echo
echo "services"
check "grafana    :3000" "http://localhost:3000/api/health"          "database"
check "prometheus :9090" "http://localhost:9090/-/healthy"           "."
check "loki       :3100" "http://localhost:3100/ready"               "ready"
check "alloy      :12345" "http://localhost:12345/-/ready"           "."
check "gate       :8080" "http://localhost:8080/healthz"             "ok"

echo
echo "the gate"
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 -XPOST http://localhost:8080/loki/api/v1/push -d '{}' 2>/dev/null)
[ "$code" = "401" ] && ok "no key      -> 401" || bad "no key      -> got $code, expected 401"

code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 -XPOST http://localhost:8080/loki/api/v1/push \
  -H "X-Telemetry-Key: definitely-wrong" -d '{}' 2>/dev/null)
[ "$code" = "401" ] && ok "wrong key   -> 401" || bad "wrong key   -> got $code, expected 401"

echo
echo "end to end"
marker="smoke-$(date +%s)-$RANDOM"
ns=$(( $(date +%s) * 1000000000 ))
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -XPOST http://localhost:8080/loki/api/v1/push \
  -H "X-Telemetry-Key: ${TELEMETRY_SECRET:-}" -H 'Content-Type: application/json' \
  -d "{\"streams\":[{\"stream\":{\"service\":\"quotemy-api\",\"env\":\"smoke\"},\"values\":[[\"$ns\",\"{\\\"level\\\":30,\\\"time\\\":$(date +%s)000,\\\"msg\\\":\\\"$marker\\\"}\"]]}]}" 2>/dev/null)

case "$code" in
  20*) ok "push accepted ($code)" ;;
  *)   bad "push rejected ($code)" ;;
esac

# Loki indexes asynchronously; a read straight after a write is genuinely too early.
found=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  sleep 1
  found=$(curl -fsS --max-time 5 -G http://localhost:3100/loki/api/v1/query_range \
    --data-urlencode 'query={service="quotemy-api"}' \
    --data-urlencode "start=$(( $(date +%s) - 300 ))000000000" 2>/dev/null | grep -c "$marker" || true)
  [ "${found:-0}" != "0" ] && break
done
[ "${found:-0}" != "0" ] && ok "line found in Loki" || bad "line never arrived in Loki"

echo
echo "dashboards"
# Grafana 13 loads new dashboard FILES at startup. Dropping one in and waiting for the rescan is
# not enough - it stayed invisible for twenty minutes here with nothing logged either way. If this
# fails and the file exists, the answer is `docker compose restart grafana`.
want="quotemy-money quotemy-traffic quotemy-chat quotemy-pipe quotemy-onboarding"
have=$(curl -fsS --max-time 5 -u "${GRAFANA_USER:-admin}:${GRAFANA_PASSWORD:-admin}" \
  'http://localhost:3000/api/search?type=dash-db' 2>/dev/null || echo '')
for uid in $want; do
  if printf '%s' "$have" | grep -q "\"$uid\""; then ok "$uid"; else bad "$uid not loaded - try: docker compose restart grafana"; fi
done

echo
if [ "$fail" -eq 0 ]; then
  printf '\033[32m%d passed.\033[0m The pipe is joined up.\n\n' "$pass"
else
  printf '\033[31m%d failed\033[0m, %d passed.  Try: docker compose logs --tail=40\n\n' "$fail" "$pass"
fi
exit "$fail"
