#!/bin/sh
set -e
cd "$(dirname "$0")/.."
npm run typecheck
npm run lint
npm test
