#!/bin/bash
# OpenMAIC 上游同步脚本
# 用法: ./sync-upstream.sh [merge|preview|cherry-pick <commit>]

set -e

cd "$(dirname "$0")"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   OpenMAIC 上游同步工具${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 获取上游更新
echo -e "${YELLOW}[1/3] 获取上游更新...${NC}"
git fetch upstream 2>&1 | grep -E "^\s*\[" || echo "已是最新"

# 统计
BEHIND=$(git rev-list --count HEAD..upstream/main)
AHEAD=$(git rev-list --count upstream/main..HEAD)

echo ""
echo -e "${YELLOW}[2/3] 状态统计${NC}"
echo -e "  本地领先: ${GREEN}${AHEAD}${NC} 个提交"
echo -e "  上游领先: ${RED}${BEHIND}${NC} 个提交"
echo ""

if [ "$BEHIND" -eq 0 ]; then
    echo -e "${GREEN}✓ 本地已与上游同步${NC}"
    exit 0
fi

# 根据参数执行不同操作
case "$1" in
    preview|"")
        echo -e "${YELLOW}[3/3] 上游新提交预览${NC}"
        echo ""
        git log HEAD..upstream/main --oneline --format="  %C(yellow)%h%C(reset) %s %C(dim)(%an, %cr)%C(reset)"
        echo ""
        echo -e "${BLUE}使用方法:${NC}"
        echo "  ./sync-upstream.sh preview           # 预览上游更新"
        echo "  ./sync-upstream.sh cherry-pick <hash> # 选择性合并"
        echo "  ./sync-upstream.sh merge             # 全量合并（不推荐）"
        ;;

    cherry-pick)
        if [ -z "$2" ]; then
            echo -e "${RED}错误: 请指定要合并的 commit hash${NC}"
            exit 1
        fi
        echo -e "${YELLOW}Cherry-pick: $2${NC}"
        git show --stat "$2"
        echo ""
        read -p "确认合并此提交？(y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git cherry-pick "$2"
            echo -e "${GREEN}✓ 合并成功，请测试后推送${NC}"
        fi
        ;;

    merge)
        echo -e "${RED}警告: 全量合并可能产生大量冲突${NC}"
        read -p "确认全量合并？(y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git merge upstream/main
            echo -e "${GREEN}✓ 合并完成${NC}"
        fi
        ;;

    *)
        echo "用法: $0 [preview|cherry-pick <hash>|merge]"
        exit 1
        ;;
esac