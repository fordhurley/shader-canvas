#!/usr/bin/env bash

if [[ "$(git status --porcelain -- build/)" ]]; then
  echo "build/ is dirty"
  exit 1
fi
