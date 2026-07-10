#!/usr/bin/env bash
set -uo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_response.filePath // empty')

if [[ -z "$file_path" || "$file_path" != *"/by-iara-web/"* ]]; then
  exit 0
fi

repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$repo_root/by-iara-web" || exit 0

output=$(pnpm nx affected -t lint test --uncommitted 2>&1)
status=$?

if [[ $status -ne 0 ]]; then
  echo "$output" | tail -60
  exit 2
fi
exit 0
