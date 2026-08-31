#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

python3 -m json.tool "$project_dir/manifest.json" >/dev/null

while IFS= read -r -d '' file; do
  node --check "$file"
done < <(find "$project_dir/src" "$project_dir/popup" -name '*.js' -print0)

for required in \
  manifest.json \
  popup/popup.html \
  popup/popup.css \
  popup/popup.js \
  src/storage.js \
  src/grid-settings.js \
  src/ui.js \
  src/content.js \
  styles/content.css; do
  test -f "$project_dir/$required"
done

echo "Extension files validated successfully."
