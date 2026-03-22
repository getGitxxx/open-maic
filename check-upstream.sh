#!/bin/bash
# OpenMAIC 上游更新检查脚本
# 用法: ./check-upstream.sh [--auto-merge]

set -e

cd "$(dirname "$0")"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   OpenMAIC 上游更新检查${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 获取上游更新
echo -e "${YELLOW}[1/4] 获取上游更新...${NC}"
git fetch upstream 2>&1 | grep -E "^\s*\[" || echo "已是最新"

# 获取本地和上游的差异
LOCAL_HEAD=$(git rev-parse HEAD)
UPSTREAM_HEAD=$(git rev-parse upstream/main)

if [ "$LOCAL_HEAD" = "$UPSTREAM_HEAD" ]; then
    echo -e "${GREEN}✓ 本地已与上游同步，无需更新${NC}"
    exit 0
fi

# 统计
BEHIND=$(git rev-list --count HEAD..upstream/main)
AHEAD=$(git rev-list --count upstream/main..HEAD)

echo ""
echo -e "${YELLOW}[2/4] 状态统计${NC}"
echo -e "  本地领先: ${GREEN}${AHEAD}${NC} 个提交"
echo -e "  上游领先: ${RED}${BEHIND}${NC} 个提交"
echo ""

# 列出上游新提交
echo -e "${YELLOW}[3/4] 上游新提交列表${NC}"
echo ""
git log HEAD..upstream/main --oneline --format="  %C(yellow)%h%C(reset) %s %C(dim)(%an, %cr)%C(reset)"
echo ""

# 列出本地独有提交
if [ "$AHEAD" -gt 0 ]; then
    echo -e "${YELLOW}[4/4] 本地二次开发提交 (${AHEAD}个)${NC}"
    echo ""
    git log upstream/main..HEAD --oneline --format="  %C(green)%h%C(reset) %s" | head -20
    if [ "$AHEAD" -gt 20 ]; then
        echo "  ... 还有 $((AHEAD - 20)) 个提交"
    fi
    echo ""
fi

# 自动合并模式
if [ "$1" = "--auto-merge" ]; then
    echo -e "${YELLOW}自动合并模式：尝试 cherry-pick 上游提交...${NC}"
    
    # 获取上游提交列表
    COMMITS=$(git rev-list --reverse HEAD..upstream/main)
    
    for COMMIT in $COMMITS; do
        MSG=$(git log -1 --format="%s" $COMMIT)
        echo -e "  尝试合并: ${COMMIT:0:7} ${MSG}"
        
        if git cherry-pick $COMMIT --no-commit 2>/dev/null; then
            git commit --no-edit -m "$(git log -1 --format="%s" $COMMIT)"
            echo -e "  ${GREEN}✓ 成功${NC}"
        else
            echo -e "  ${RED}✗ 有冲突，跳过${NC}"
            git cherry-pick --abort 2>/dev/null || true
        fi
    done
    
    echo ""
    echo -e "${GREEN}合并完成！请检查并推送：git push origin main${NC}"
else
    # 手动模式提示
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   建议操作${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo "1. 查看详情："
    echo "   git log HEAD..upstream/main --stat"
    echo ""
    echo "2. 选择性合并（推荐）："
    echo "   git cherry-pick <commit-hash>"
    echo ""
    echo "3. 全量合并（可能有冲突）："
    echo "   git merge upstream/main"
    echo ""
    echo "4. 自动合并所有上游提交："
    echo "   ./check-upstream.sh --auto-merge"
fi
