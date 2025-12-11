#!/bin/bash

# 确保脚本在遇到错误时停止执行
set -e

# 删除旧的目录
echo "删除旧的构建目录..."
rm -rf dist

# 构建
echo "开始配置环境变量..."
cat << EOF > .env
VITE_BASE_URL=/game-emulator-chip8-js/
VITE_BUILD_DIR=dist/game-emulator-chip8-js
EOF

# 运行构建脚本
echo "运行构建脚本..."
npm run build

# 进入构建目录
cd dist/game-emulator-chip8-js
cp index.html 404.html
touch .nojekyll # 防止 github pages 忽略 _ 开头的文件

# 初始化 git 仓库（如果不存在）
if [ ! -d .git ]; then
    git init
    git remote add origin git@github.com:gaussemu/game-emulator-chip8-js.git
fi

# 添加所有文件到 git
git add .

# 提交更改
git commit -m "部署到 GitHub Pages"

# 推送到 gh-pages 分支
echo "正在推送到 GitHub Pages..."
git push -f origin HEAD:gh-pages

echo "部署完成！" 