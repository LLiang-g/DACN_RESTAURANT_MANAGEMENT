#!/bin/sh
set -eu

url=${CUSTOMER_PUBLIC_BASE_URL:-}
case "$url" in
  http://*|https://*) ;;
  *) echo >&2 'Set CUSTOMER_PUBLIC_BASE_URL to an absolute Customer URL'; exit 1 ;;
esac
# Only an origin and optional trailing slash; exclude quotes/backslashes to keep JS safe.
case "$url" in
  *[!a-zA-Z0-9.:/-]*) echo >&2 'Unsupported characters in Customer URL'; exit 1 ;;
esac
authority=${url#*://}
authority=${authority%/}
case "$authority" in
  ''|*/*) echo >&2 'Customer URL must have no path'; exit 1 ;;
esac
printf 'window.__SMART_POS_CONFIG__ = { customerUrl: "%s" };\n' "$url" > /usr/share/nginx/html/admin/runtime-config.js
