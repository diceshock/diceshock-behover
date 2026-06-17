#!/bin/sh
if [ -f ./target/release/ty-jk ]; then
  exec ./target/release/ty-jk "$@"
fi
# CI fallback: ty-jk not built, run as root-level pnpm script
exec pnpm run "$@"
