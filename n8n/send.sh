#!/usr/bin/env bash
# Send a test description to the onboarding webhook.
#
#   ./n8n/send.sh <webhook-url> <description.txt> [businessUid]
#
# Example:
#   ./n8n/send.sh http://localhost:5678/webhook/business-onboarding-fencing \
#       tests/fixtures/description-GOOD-southeast-fencing.txt test-biz-1
#
# Use /webhook-test/ instead of /webhook/ in the URL while the workflow is open in the n8n editor
# and you've clicked "Execute workflow" — that's the manual-run endpoint.
set -euo pipefail

URL="${1:?usage: send.sh <webhook-url> <description.txt> [businessUid]}"
FILE="${2:?usage: send.sh <webhook-url> <description.txt> [businessUid]}"
UID_ARG="${3:-test-biz-1}"

# python does the JSON escaping so newlines/quotes/$ in the description survive intact
PAYLOAD=$(python3 -c '
import json, sys
print(json.dumps({
    "businessUid": sys.argv[1],
    "trade": "fencing",
    "text": open(sys.argv[2]).read(),
}))
' "$UID_ARG" "$FILE")

curl -sS -X POST "$URL" -H 'Content-Type: application/json' -d "$PAYLOAD" | python3 -m json.tool
