#!/usr/bin/env bash
# Installs the unsigned extension into Firefox's application folder (needs sudo), then restart Firefox.
#
# Arch/CachyOS build Firefox to accept unsigned extensions in that folder (MOZ_UNSIGNED_APP_SCOPE)
# and enable them without asking (extensions.autoDisableScopes = 11 in vendor.js). Firefox only
# rescans the folder after its own updates, so this also sets extensions.startupScanScopes to
# include it (4), which makes installs and updates show up on the next restart.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
XPI="$REPO_DIR/dist/home-two.xpi"
ID=$(jq -r '.browser_specific_settings.gecko.id' "$REPO_DIR/public/manifest.json")
FIREFOX_DIR=/usr/lib/firefox/browser

[[ -f "$XPI" ]] || { echo "$XPI not found, run npm run build first" >&2; exit 1; }

prefs=$(mktemp)
trap 'rm -f "$prefs"' EXIT
echo 'pref("extensions.startupScanScopes", 4);' > "$prefs"

sudo install -Dm644 "$XPI" "$FIREFOX_DIR/extensions/$ID.xpi"
sudo install -Dm644 "$prefs" "$FIREFOX_DIR/defaults/preferences/home-two.js"

echo "Installed $FIREFOX_DIR/extensions/$ID.xpi, restart Firefox to load it"
