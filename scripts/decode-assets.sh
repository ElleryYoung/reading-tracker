#!/usr/bin/env bash
# 将 assets-src/*.b64 还原为 public/*.png（GitHub 仓库以 base64 文本存储图片资源）
set -e
cd "$(dirname "$0")/.."
for f in assets-src/*.b64; do
  base64 -d "$f" > "public/$(basename "$f" .b64)"
done
echo "decoded $(ls assets-src/*.b64 | wc -l) assets into public/"
