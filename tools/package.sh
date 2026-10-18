#!/bin/sh
# Builds the ZIP bundle for the YouTube Playables Developer Portal (runtime files only).
set -e
cd "$(dirname "$0")/.."
mkdir -p dist
rm -f dist/sun-and-moon.zip
zip -r -q dist/sun-and-moon.zip index.html css js assets
echo "Created dist/sun-and-moon.zip ($(du -h dist/sun-and-moon.zip | cut -f1))"
