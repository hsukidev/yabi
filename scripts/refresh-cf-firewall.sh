#!/usr/bin/env bash
# Refreshes the Cloudflare IP ranges on the DO firewall's port 80/443 rules.
# Leaves SSH (port 22) and any other rules untouched.
set -euo pipefail

: "${DO_TOKEN:?DO_TOKEN env var required}"
: "${DO_FIREWALL_ID:?DO_FIREWALL_ID env var required}"

# Use Cloudflare's API endpoint (purpose-built for programmatic access).
# The public docs URLs (https://www.cloudflare.com/ips-v4/) sit behind
# Cloudflare's bot management and can return 403 to CI runners.
echo "[1/3] Fetching Cloudflare IP ranges from api.cloudflare.com..."
CF_RESPONSE=$(curl -fsSL https://api.cloudflare.com/client/v4/ips)

if [[ "$(echo "$CF_RESPONSE" | jq -r '.success')" != "true" ]]; then
  echo "Cloudflare IP API returned non-success response — aborting" >&2
  echo "$CF_RESPONSE" >&2
  exit 1
fi

CF_ALL=$(echo "$CF_RESPONSE" | jq '.result.ipv4_cidrs + .result.ipv6_cidrs')

if [[ "$(echo "$CF_ALL" | jq 'length')" -eq 0 ]]; then
  echo "Cloudflare IP list is empty — aborting" >&2
  exit 1
fi

echo "      Got $(echo "$CF_ALL" | jq length) CIDR ranges from Cloudflare"

echo "[2/3] Fetching current DO firewall config (firewall id: ${DO_FIREWALL_ID:0:8}...)..."
CURRENT=$(curl -fsSL \
  -H "Authorization: Bearer $DO_TOKEN" \
  "https://api.digitalocean.com/v2/firewalls/$DO_FIREWALL_ID")

echo "      Got firewall '$(echo "$CURRENT" | jq -r '.firewall.name')'"

# Defensive guard: if the GET returns no droplet attachments AND no tags,
# either (a) the firewall is genuinely unattached (a no-op anyway), or (b)
# the token lacks droplet:read scope and DO has redacted the lists. PUTting
# the empty arrays back would detach any droplets the firewall was applied
# to. Refuse unless the caller explicitly opts in.
DROPLET_COUNT=$(echo "$CURRENT" | jq '.firewall.droplet_ids | length')
TAG_COUNT=$(echo "$CURRENT" | jq '.firewall.tags | length')

if [[ "$DROPLET_COUNT" -eq 0 && "$TAG_COUNT" -eq 0 && "${FORCE_EMPTY_ATTACHMENT:-}" != "1" ]]; then
  echo "Refusing to push: firewall has empty droplet_ids and tags." >&2
  echo "Either the firewall is unattached (no-op) or the token lacks" >&2
  echo "droplet:read scope and DO redacted the response. Pushing this" >&2
  echo "back would detach any droplets the firewall was applied to." >&2
  echo "If the firewall is genuinely unattached, set FORCE_EMPTY_ATTACHMENT=1." >&2
  exit 1
fi

echo "      Attachments: $DROPLET_COUNT droplet(s), $TAG_COUNT tag(s)"

NEW=$(echo "$CURRENT" | jq --argjson cf "$CF_ALL" '
  .firewall
  | .inbound_rules |= map(
      if (.protocol == "tcp" and (.ports == "80" or .ports == "443"))
      then .sources.addresses = $cf
      else .
      end
    )
  | { name, inbound_rules, outbound_rules, droplet_ids, tags }
')

echo "[3/3] Pushing updated firewall config..."
echo "      Payload summary: $(echo "$NEW" | jq -c '{name, inbound_count: (.inbound_rules | length), droplet_ids, tags}')"

HTTP_BODY_FILE=$(mktemp)
HTTP_STATUS=$(curl -sS -o "$HTTP_BODY_FILE" -w "%{http_code}" -X PUT \
  -H "Authorization: Bearer $DO_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$NEW" \
  "https://api.digitalocean.com/v2/firewalls/$DO_FIREWALL_ID")

if [[ "$HTTP_STATUS" -lt 200 || "$HTTP_STATUS" -ge 300 ]]; then
  echo "DO PUT failed with HTTP $HTTP_STATUS" >&2
  echo "Response body:" >&2
  cat "$HTTP_BODY_FILE" >&2
  echo >&2
  rm -f "$HTTP_BODY_FILE"
  exit 1
fi

rm -f "$HTTP_BODY_FILE"
echo "Firewall $DO_FIREWALL_ID updated with $(echo "$CF_ALL" | jq length) Cloudflare ranges"
