#!/bin/bash

# 确保脚本在遇到错误时停止执行
set -e

# 删除旧的目录
echo "删除旧的构建目录..."
rm -rf dist

# 构建
echo "开始配置环境变量..."
cat << EOF > .env
VITE_BASE_URL=/
VITE_BUILD_DIR=dist
EOF

# 运行构建脚本
echo "运行构建脚本..."
npm run build

# 进入构建目录
cd dist
cp index.html 404.html
cp index.html mobile.html

# 压缩
cd -

if [ ! -d out ]; then
    mkdir out
fi

node scripts/archive.cjs
echo "归档完成！" 