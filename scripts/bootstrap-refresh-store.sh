#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat >&2 <<'USAGE'
Usage:
  scripts/bootstrap-refresh-store.sh STORE.myshopify.com REFRESH_THEME_ID [target_theme_path]

Example:
  scripts/bootstrap-refresh-store.sh independence-phone.myshopify.com 123456789012 /Users/vilovieta/Documents/Shopify/refresh-theme

What it does:
  1. Pulls the specified Shopify Refresh theme locally.
  2. Applies the Patriot Phone Refresh overlay.
  3. Runs Shopify Theme Check against the resulting local theme.

Set ALLOW_EXISTING_REFRESH_THEME=1 to reuse a non-empty target directory.
USAGE
}

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  usage
  exit 64
fi

store="$1"
theme_id="$2"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target_theme="${3:-$repo_root/refresh-theme}"

if ! command -v shopify >/dev/null 2>&1; then
  echo "Shopify CLI is not available on PATH." >&2
  exit 69
fi

if [[ "$store" != *.myshopify.com ]]; then
  echo "Store must be the myshopify.com handle, for example STORE.myshopify.com: $store" >&2
  exit 64
fi

if [[ ! "$theme_id" =~ ^[0-9]+$ ]]; then
  echo "Refresh theme ID must be numeric: $theme_id" >&2
  exit 64
fi

if [ -d "$target_theme" ] && [ -n "$(find "$target_theme" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  if [ "${ALLOW_EXISTING_REFRESH_THEME:-0}" != "1" ]; then
    echo "Target theme directory is not empty: $target_theme" >&2
    echo "Use a new path or set ALLOW_EXISTING_REFRESH_THEME=1 after pulling/reviewing remote changes." >&2
    exit 73
  fi
fi

mkdir -p "$(dirname "$target_theme")"

echo "Pulling Refresh theme $theme_id from $store into $target_theme"
shopify theme pull --store "$store" --theme "$theme_id" --path "$target_theme"

echo "Applying Patriot Phone overlay"
"$repo_root/scripts/apply-refresh-overlay.sh" "$target_theme"

echo "Running Theme Check"
shopify theme check --path "$target_theme"

cat <<NEXT

Refresh bootstrap complete.

Next command:
  cd "$target_theme"
  shopify theme dev --store "$store" --theme "$theme_id"

Then continue with:
  $repo_root/store-setup/LAUNCH_CHECKLIST.md
NEXT
