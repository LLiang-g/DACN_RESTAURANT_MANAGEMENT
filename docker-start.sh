#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if ! docker info >/dev/null 2>&1; then
  echo "Please start Docker Desktop, then run this script again."
  exit 1
fi
docker compose --ansi never --progress plain up --build -d
docker compose ps
