#!/bin/bash

# 🤖 Claude 多实例 VS Code + tmux 直接模式

# 加载proxy_git
if declare -f proxy_git &>/dev/null; then
    proxy_git
elif command -v proxy_git &>/dev/null; then
    proxy_git
else
    source ~/.zshrc &>/dev/null || true
    proxy_git 2>/dev/null || echo "⚠️ proxy_git 未找到，继续启动..."
fi

set -e

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. 启动Message Router (如果未运行)
if ! curl -s http://localhost:3333/health > /dev/null 2>&1; then
    echo -e "${BLUE}启动 Message Router...${NC}"
    cd /Users/ghostcorn/dev/zenwish-voice/message-router
    nohup bun run router-simple.ts > /tmp/claude-router.log 2>&1 &
    sleep 2
    echo -e "${GREEN}✅ Message Router 已启动${NC}"
fi

# 2. 根据参数启动对应实例
INSTANCE_TYPE=${1:-"help"}

case "$INSTANCE_TYPE" in
    "main")
        echo -e "${PURPLE}🎯 启动主控 Claude (tmux模式)${NC}"
        WORK_DIR="/Users/ghostcorn/dev/zenwish-voice"
        export CLAUDE_INSTANCE_ID=main CLAUDE_INSTANCE_NAME=主控 CLAUDE_INSTANCE_ROLE=main
        TMUX_SESSION="main-vscode"
        ;;
    "ui")
        echo -e "${PURPLE}🎨 启动UI分支 Claude (tmux模式)${NC}"
        WORK_DIR="/Users/ghostcorn/dev/zenwish-voice-ui-improvements"
        export CLAUDE_INSTANCE_ID=ui CLAUDE_INSTANCE_NAME=UI分支 CLAUDE_INSTANCE_ROLE=ui
        TMUX_SESSION="ui-vscode"
        ;;
    "api")
        echo -e "${PURPLE}⚡ 启动API分支 Claude (tmux模式)${NC}"
        WORK_DIR="/Users/ghostcorn/dev/zenwish-voice-api-refactor"
        export CLAUDE_INSTANCE_ID=api CLAUDE_INSTANCE_NAME=API分支 CLAUDE_INSTANCE_ROLE=api
        TMUX_SESSION="api-vscode"
        ;;
    *)
        echo -e "${GREEN}使用方法:${NC}"
        echo "  $0 main   # 主控实例"
        echo "  $0 ui     # UI分支实例"
        echo "  $0 api    # API分支实例"
        echo ""
        echo -e "${YELLOW}tmux模式特点:${NC}"
        echo "  • Claude直接在tmux会话中运行"
        echo "  • 消息可以通过send-keys直接显示"
        echo "  • 在VS Code终端中看到完整的tmux会话"
        exit 0
        ;;
esac

# 3. 设置通用环境变量
export CLAUDE_AUTO_CONFIRM=yes
export TERM_PROGRAM=vscode

echo "📁 工作目录: $WORK_DIR"
echo "🔗 tmux会话: $TMUX_SESSION"
echo ""

# 4. 清理并创建tmux会话
echo -e "${BLUE}🔧 设置tmux会话...${NC}"

# 清理旧会话
tmux kill-session -t $TMUX_SESSION 2>/dev/null || true
sleep 1

# 创建新的tmux会话但不立即attach
tmux new-session -d -s $TMUX_SESSION -c "$WORK_DIR"

# 在tmux会话中设置环境变量
tmux send-keys -t $TMUX_SESSION "cd $WORK_DIR" Enter
tmux send-keys -t $TMUX_SESSION "export CLAUDE_INSTANCE_ID=$INSTANCE_TYPE" Enter
tmux send-keys -t $TMUX_SESSION "export CLAUDE_INSTANCE_NAME='${CLAUDE_INSTANCE_NAME}'" Enter
tmux send-keys -t $TMUX_SESSION "export CLAUDE_INSTANCE_ROLE=$INSTANCE_TYPE" Enter
tmux send-keys -t $TMUX_SESSION "export CLAUDE_AUTO_CONFIRM=yes" Enter
tmux send-keys -t $TMUX_SESSION "clear" Enter

# 显示启动信息
tmux send-keys -t $TMUX_SESSION "echo '🎯 ${CLAUDE_INSTANCE_NAME} Claude 实例'" Enter
tmux send-keys -t $TMUX_SESSION "echo '📁 工作目录: $(pwd)'" Enter  
tmux send-keys -t $TMUX_SESSION "echo '🔗 tmux会话: $TMUX_SESSION'" Enter
tmux send-keys -t $TMUX_SESSION "echo '💬 消息接收: 已启用 (send-keys)'" Enter
tmux send-keys -t $TMUX_SESSION "echo ''" Enter

echo -e "${GREEN}✅ tmux会话 '$TMUX_SESSION' 已准备就绪${NC}"

# 5. 注册实例到Router
echo -e "${BLUE}📝 注册实例到 Router...${NC}"

ROLE_NAME=""
case "$INSTANCE_TYPE" in
    "main") ROLE_NAME="主控" ;;
    "ui") ROLE_NAME="UI分支" ;;
    "api") ROLE_NAME="API分支" ;;
esac

# 注册到Router (使用tmux会话)
curl -s -X POST http://localhost:3333/register \
    -H "Content-Type: application/json" \
    -d "{
        \"id\": \"$INSTANCE_TYPE\",
        \"name\": \"$ROLE_NAME\", 
        \"tmuxSession\": \"$TMUX_SESSION\",
        \"windowType\": \"tmux-session\",
        \"role\": \"$INSTANCE_TYPE\"
    }" > /dev/null && echo -e "${GREEN}✅ ${ROLE_NAME}已注册到Router${NC}" || echo -e "⚠️ Router注册失败，继续启动..."

echo ""

# 6. 在tmux会话中启动Claude
echo -e "${BLUE}🚀 在tmux会话中启动Claude...${NC}"
tmux send-keys -t $TMUX_SESSION "claude --dangerously-skip-permissions" Enter

# 7. 连接到tmux会话 (在VS Code终端中显示)
echo -e "${GREEN}🔗 连接到tmux会话 (按Ctrl+B然后D可以离开会话)${NC}"
sleep 2

# 直接attach到tmux会话
tmux attach -t $TMUX_SESSION