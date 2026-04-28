#!/usr/bin/env bash
# Refreshes the Cloudflare IP ranges on the DO firewall's port 80/443 rules.
# Leaves SSH (port 22) and any other rules untouched.
set -euo pipefail

: "${DO_TOKEN:?DO_TOKEN env var required}"
: "${DO_FIREWALL_ID:?DO_FIREWALL_ID env var required}"

CF_V4=$(curl -fsSL https://www.cloudflare.com/ips-v4/)
CF_V6=$(curl -fsSL https://www.cloudflare.com/ips-v6/)

# Sanity check: refuse to push if either list came back empty.
if [[ -z "$CF_V4" || -z "$CF_V6" ]]; then
  echo "Cloudflare IP fetch returned empty list — aborting" >&2
  exit 1
fi

CF_ALL=$(printf '%s\n%s\n' "$CF_V4" "$CF_V6" | grep -v '^$' | jq -R . | jq -s .)

CURRENT=$(curl -fsSL \
  -H "Authorization: Bearer $DO_TOKEN" \
  "https://api.digitalocean.com/v2/firewalls/$DO_FIREWALL_ID")

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

curl -fsSL -X PUT \
  -H "Authorization: Bearer $DO_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$NEW" \
  "https://api.digitalocean.com/v2/firewalls/$DO_FIREWALL_ID" \
  > /dev/null

echo "Firewall $DO_FIREWALL_ID updated with $(echo "$CF_ALL" | jq length) Cloudflare ranges"
