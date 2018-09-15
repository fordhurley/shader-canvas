#!/usr/bin/env bash

if [[ "$(git status --porcelain -- build/)" ]]; then
  echo "build/ is dirty -- run 'npm run build' and commit the result"
  exit 1
fi
