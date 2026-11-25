#!/usr/bin/env bash
# Uses only synthetic test data. Do not pass real passphrases to this harness.
set -Eeuo pipefail
umask 077

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
SEVENZIP_BIN="${SEVENZIP_BIN:-}"
WORK_DIR=""
NATIVE_ONLY=false
# Public synthetic test constants, never production credentials.
TEST_PASSPHRASE="SecurBrowser integration fixture only"
WRONG_PASSPHRASE="SecurBrowser deliberately incorrect fixture"

cleanup() {
  if [[ -n "$WORK_DIR" && -d "$WORK_DIR" ]]; then rm -rf -- "$WORK_DIR"; fi
}

resolve_engine() {
  if [[ -n "$SEVENZIP_BIN" ]]; then
    SEVENZIP_BIN="$(command -v -- "$SEVENZIP_BIN")" || { echo 'Invalid SEVENZIP_BIN' >&2; return 1; }
  elif command -v 7zz >/dev/null 2>&1; then SEVENZIP_BIN="$(command -v 7zz)"
  elif command -v 7z >/dev/null 2>&1; then SEVENZIP_BIN="$(command -v 7z)"
  else echo 'Native 7-Zip not installed (7zz or 7z). Install it, or set SEVENZIP_BIN.' >&2; return 1
  fi
  # Resolve a relative override before changing the working directory.
  if [[ "$SEVENZIP_BIN" != /* ]]; then
    SEVENZIP_BIN="$(cd -- "$(dirname -- "$SEVENZIP_BIN")" && pwd)/$(basename -- "$SEVENZIP_BIN")"
  fi
  echo "Native 7-Zip executable: $SEVENZIP_BIN"
  "$SEVENZIP_BIN" i > "$WORK_DIR/engine.txt"
  if ! grep -Eqi "7-Zip|p7zip" "$WORK_DIR/engine.txt"; then
    echo "FAIL: selected command does not identify itself as 7-Zip" >&2; return 1
  fi
  sed -n '1,5p' "$WORK_DIR/engine.txt"
}

make_fixtures() {
  mkdir -p "$WORK_DIR/fixture/nested" "$WORK_DIR/native-out"
  printf 'synthetic archive fixture\n' > "$WORK_DIR/fixture/notes.txt"
  printf '\000\001\002\377\376' > "$WORK_DIR/fixture/nested/binary.dat"
  printf 'unicode fixture\n' > "$WORK_DIR/fixture/nested/caf\303\251.txt"
  printf 'literal filename\n' > "$WORK_DIR/fixture/@literal.txt"
  : > "$WORK_DIR/fixture/empty.bin"
  (cd "$WORK_DIR"; "$SEVENZIP_BIN" a -t7z -mhe=on -mx=5 "-p$TEST_PASSPHRASE" -y -bd native.7z fixture >/dev/null)
  # Truncation is a deterministic corruption fixture; no crafted exploit data.
  head -c 16 "$WORK_DIR/native.7z" > "$WORK_DIR/truncated.7z"
}

check_archive() {
  local archive="$1" log="$WORK_DIR/wrong-list.txt" status=0
  "$SEVENZIP_BIN" t -t7z "-p$TEST_PASSPHRASE" -y -bd "$archive" >/dev/null || return 1
  "$SEVENZIP_BIN" l -t7z -slt "-p$TEST_PASSPHRASE" -bd "$archive" > "$WORK_DIR/correct-list.txt" || return 1
  while IFS= read -r name; do
    if ! grep -Fxq -- "Path = $name" "$WORK_DIR/correct-list.txt"; then
      echo 'FAIL: expected internal path missing from correct-password listing' >&2; return 1
    fi
  done < <(cd "$WORK_DIR"; find fixture -type f)
  "$SEVENZIP_BIN" l -t7z -slt "-p$WRONG_PASSPHRASE" -bd "$archive" > "$log" 2>&1 || status=$?
  if [[ "$status" -ne 2 ]]; then
    echo "FAIL: wrong-passphrase listing must return fatal archive error 2, got $status" >&2; return 1
  fi
  # A failed listing alone is insufficient if internal filenames were disclosed first.
  while IFS= read -r name; do
    if grep -Fq -- "$name" "$log"; then echo 'FAIL: internal filename disclosed' >&2; return 1; fi
  done < <(find "$WORK_DIR/fixture" -type f -exec basename {} \;)
  status=0
  "$SEVENZIP_BIN" t -t7z "-p$WRONG_PASSPHRASE" -y -bd "$archive" >/dev/null 2>&1 || status=$?
  if [[ "$status" -ne 2 ]]; then
    echo "FAIL: wrong-passphrase integrity test must return 2, got $status" >&2; return 1
  fi
  echo "PASS: native integrity and wrong-passphrase/header checks: $(basename -- "$archive")"
}

native_negative_control() {
  # Verify the harness detects a real archive with encryption but visible names.
  (cd "$WORK_DIR"; "$SEVENZIP_BIN" a -t7z -mhe=off -mx=5 "-p$TEST_PASSPHRASE" -y -bd visible.7z fixture >/dev/null)
  local status=0
  "$SEVENZIP_BIN" l -t7z -slt "-p$WRONG_PASSPHRASE" -bd "$WORK_DIR/visible.7z" > "$WORK_DIR/visible-list.txt" 2>&1 || status=$?
  if [[ "$status" -ne 0 ]] || ! grep -Fxq 'Path = fixture/notes.txt' "$WORK_DIR/visible-list.txt"; then
    echo 'FAIL: native visible-header negative control did not behave as expected' >&2; return 1
  fi
  if check_archive "$WORK_DIR/visible.7z" > "$WORK_DIR/negative-control.txt" 2>&1; then
    echo 'FAIL: header-encryption check accepted an archive with visible filenames' >&2; return 1
  fi
  status=0
  "$SEVENZIP_BIN" t -t7z "-p$TEST_PASSPHRASE" -y -bd "$WORK_DIR/truncated.7z" >/dev/null 2>&1 || status=$?
  if [[ "$status" -ne 2 ]]; then
    echo "FAIL: native truncated archive test must return 2, got $status" >&2; return 1
  fi
  echo 'PASS: native visible-header and truncated-archive negative controls'
}

run_browser() {
  cd "$ROOT_DIR"
  if [[ ! -x node_modules/.bin/playwright ]]; then echo 'Run npm ci and install Playwright Chromium first.' >&2; return 1; fi
  npm run vendor:sevenzip:check
  SBT_INTEROP_DIR="$WORK_DIR" SBT_TEST_PASSPHRASE="$TEST_PASSPHRASE" SBT_WRONG_PASSPHRASE="$WRONG_PASSPHRASE" \
    node_modules/.bin/playwright test --config playwright.interop.config.js
}

main() {
  case "${1:-}" in
    "") ;;
    --native-only) NATIVE_ONLY=true ;;
    --help) echo 'Usage: bash scripts/test-7z-interop.sh [--native-only]'; return 0 ;;
    *) echo 'Unknown argument; use --help.' >&2; return 2 ;;
  esac
  if [[ $# -gt 1 ]]; then echo 'Unexpected additional arguments.' >&2; return 2; fi
  WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/sbt-interop.XXXXXXXX")"
  trap cleanup EXIT
  resolve_engine
  make_fixtures
  check_archive "$WORK_DIR/native.7z"
  native_negative_control
  if [[ "$NATIVE_ONLY" == true ]]; then
    echo "PASS: native-only diagnostics; browser/WASM interoperability NOT RUN."
    return 0
  fi
  run_browser
  check_archive "$WORK_DIR/browser.7z"
  "$SEVENZIP_BIN" x -t7z "-p$TEST_PASSPHRASE" -y -bd "-o$WORK_DIR/native-out" "$WORK_DIR/browser.7z" >/dev/null
  diff -r -- "$WORK_DIR/fixture" "$WORK_DIR/native-out/fixture"
  echo 'PASS: WASM -> native 7-Zip extraction and byte-for-byte tree comparison'
  echo 'PASS: native 7-Zip -> WASM extraction and all file byte comparisons'
}

main "$@"
