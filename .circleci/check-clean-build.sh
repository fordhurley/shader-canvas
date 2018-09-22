#!/usr/bin/env bash

if [[ "$(git status --porcelain -- dist/)" ]]; then
  echo "dist/ is dirty"
  exit 1
fi
