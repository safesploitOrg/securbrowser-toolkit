#!/usr/bin/env bash
# Generate an actual npm lockfile in isolation, verify npm ci, then offer it for review.
set -Eeuo pipefail
umask 077

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_DIR=""

cleanup() {
  if [[ -n "$WORK_DIR" && -d "$WORK_DIR" ]]; then rm -rf -- "$WORK_DIR"; fi
}

main() {
  cd "$ROOT_DIR"
  if [[ -e package-lock.json || -L package-lock.json ]]; then
    echo 'Refusing to replace an existing package-lock.json. Review intentional dependency updates separately.' >&2
    return 1
  fi
  if [[ "$(node --version)" != "v$(cat .node-version)" ]]; then
    echo "Use Node $(cat .node-version) before preparing the release lockfile." >&2
    return 1
  fi
  WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/sbt-lockfile.XXXXXXXX")"
  trap cleanup EXIT
  cp package.json "$WORK_DIR/package.json"
  (
    cd "$WORK_DIR"
    export npm_config_registry=https://registry.npmjs.org/
    npm install --package-lock-only --ignore-scripts --no-audit --no-fund
    node "$ROOT_DIR/scripts/check-lockfile.mjs" "$WORK_DIR"
    cp package-lock.json expected-lock.json
    npm ci --ignore-scripts --no-audit --no-fund
    cmp expected-lock.json package-lock.json
    cmp "$ROOT_DIR/package.json" package.json
  )
  # A hard link atomically refuses an existing target, including a symlink.
  # Use a same-directory temporary file because /tmp may be a different filesystem.
  local temporary
  temporary="$(mktemp "$ROOT_DIR/.package-lock.XXXXXXXX")"
  cp "$WORK_DIR/package-lock.json" "$temporary"
  chmod 644 "$temporary"
  if ! ln "$temporary" "$ROOT_DIR/package-lock.json"; then
    rm -f -- "$temporary"
    return 1
  fi
  rm -f -- "$temporary"
  node scripts/check-lockfile.mjs
  echo 'Review and commit package-lock.json. Do not treat lockfile creation as a security or release approval.'
}

main "$@"
