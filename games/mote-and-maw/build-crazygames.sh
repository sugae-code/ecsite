#!/usr/bin/env bash
# Produce the CrazyGames HTML5 build from the exact checked-out source.
# Covers and preview videos are uploaded separately in the developer portal.
set -euo pipefail
game_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
output="${1:-$game_dir/mote-and-maw-crazygames-build.zip}"
files=(index.html style.css engine.mjs game.mjs crazygames-bridge.mjs)

for file in "${files[@]}"; do
  test -s "$game_dir/$file" || { echo "Missing or empty: $file" >&2; exit 1; }
done
command -v node >/dev/null && command -v zip >/dev/null && command -v unzip >/dev/null
node --test "$game_dir/engine.test.mjs" "$game_dir/crazygames-bridge.test.mjs"
grep -Fq 'const CRAZYGAMES_FULL_LAUNCH_APPROVED = false;' "$game_dir/game.mjs" || {
  echo "Refusing to package a build with an unverified ad approval flag" >&2; exit 1;
}
mkdir -p "$(dirname "$output")"
output="$(cd "$(dirname "$output")" && pwd)/$(basename "$output")"
rm -f "$output"
(cd "$game_dir" && zip -q -X "$output" "${files[@]}")
actual="$(unzip -Z -1 "$output" | LC_ALL=C sort)"
expected="$(printf '%s\n' "${files[@]}" | LC_ALL=C sort)"
if [[ "$actual" != "$expected" ]]; then
  echo "Unexpected build files in ZIP" >&2
  rm -f "$output"
  exit 1
fi
echo "Created $output"
sha256sum "$output"
