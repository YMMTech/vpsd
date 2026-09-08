#!/usr/bin/env bash
# Install and inspect an exact local package archive; never publish or deploy.
set -euo pipefail
if [ "$#" -ne 1 ]; then
  echo 'Usage: bash scripts/smoke-package.sh /absolute/path/to/vpsd-VERSION.tgz' >&2
  exit 2
fi
artifact=$(realpath "$1")
source_root=$(cd "$(dirname "$0")/.." && pwd)
smoke_root=$(mktemp -d "${TMPDIR:-/tmp}/vpsd-package-smoke-XXXXXX")
trap 'rm -rf "$smoke_root"' EXIT
mkdir -p "$smoke_root/bin"
export PATH="$smoke_root/bin:$PATH"
pnpm add --global --offline --global-dir "$smoke_root/global" \
  --global-bin-dir "$smoke_root/bin" --store-dir "$smoke_root/store" "$artifact"
hash -r
type -a vpsd
test "$(command -v vpsd)" = "$smoke_root/bin/vpsd"
vpsd --help
vpsd setup --help
installed="$(pnpm root --global --config.global-dir="$smoke_root/global")/vpsd"
test -f "$installed/dist/setup/setup-vps.sh"
cmp "$source_root/src/setup/setup-vps.sh" "$installed/dist/setup/setup-vps.sh"
while IFS= read -r -d '' template_file; do
  relative="${template_file#"$source_root/src/templates/"}"
  cmp "$template_file" "$installed/dist/templates/$relative"
done < <(find "$source_root/src/templates" -type f -print0)
for provider in github gitlab; do
  mkdir "$smoke_root/$provider"
  (
    cd "$smoke_root/$provider"
    vpsd init --name package-smoke --app none --ci "$provider" \
      --services none --domain test.example.com --port 3000
    if [ "$provider" = github ]; then
      ci=.github/workflows/vpsd-deploy.yml
      template=github-deploy.yml
    else
      ci=.gitlab-ci.yml
      template=gitlab-ci.yml
    fi
    cmp "$ci" "$installed/dist/templates/$template"
    grep -q 'cd app' "$ci"
    grep -q 'pnpm run --if-present test' "$ci"
    grep -q 'export APP_IMAGE' "$ci"
    grep -q 'sudo -n /usr/bin/install' "$ci"
    grep -q '/usr/bin/caddy validate' "$ci"
    grep -q '/usr/bin/caddy reload' "$ci"
    grep -q 'VPS_PORT' "$ci"
    grep -q 'VPSD_DEPLOY_PATH' "$ci"
    grep -q 'StrictHostKeyChecking=yes' "$ci"
    test -f vpsd/deploy.env
    test -d .git
  )
done
printf 'PASS: exact artifact installed; VPSD help/setup help and both init providers verified.\n'
