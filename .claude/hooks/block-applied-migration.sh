#!/usr/bin/env bash
set -uo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

if [[ -z "$file_path" || "$file_path" != *"by-iara-api/src/main/resources/db/migration/"* ]]; then
  exit 0
fi

repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
rel_path=${file_path#"$repo_root"/}

if git -C "$repo_root" cat-file -e "HEAD:$rel_path" 2>/dev/null; then
  jq -n --arg name "$(basename "$file_path")" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ($name + " is already committed to HEAD. Flyway checksums applied migrations, so editing it will break every environment that already ran it — create a new migration file instead.")
    }
  }'
fi
exit 0
