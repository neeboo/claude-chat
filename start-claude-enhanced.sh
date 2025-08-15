#!/bin/bash

# 🤖 Claude Multi-Instance VS Code + tmux Direct Mode (Enhanced with CLI)
# This script is now a wrapper around the claude-chat CLI tool

# Load proxy_git function
load_proxy() {
    if declare -f proxy_git &>/dev/null; then
        proxy_git
    elif command -v proxy_git &>/dev/null; then
        proxy_git
    else
        source ~/.zshrc &>/dev/null || true
        if declare -f proxy_git &>/dev/null; then
            proxy_git
        else
            echo "⚠️ proxy_git not found, continuing..."
            return 1
        fi
    fi
}

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default configurations
declare -A INSTANCE_CONFIGS
INSTANCE_CONFIGS[main]="/Users/ghostcorn/dev/zenwish-voice"
INSTANCE_CONFIGS[ui]="/Users/ghostcorn/dev/zenwish-voice-ui-improvements"  
INSTANCE_CONFIGS[api]="/Users/ghostcorn/dev/zenwish-voice-api-refactor"

# Get instance type
INSTANCE_TYPE=${1:-"help"}

# Show help
if [[ "$INSTANCE_TYPE" == "help" || "$INSTANCE_TYPE" == "--help" || "$INSTANCE_TYPE" == "-h" ]]; then
    echo -e "${GREEN}Claude Multi-Instance Launcher${NC}"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  $0 <instance_type> [options]"
    echo ""
    echo -e "${YELLOW}Instance Types:${NC}"
    echo "  main   - Main controller instance"
    echo "  ui     - UI branch instance" 
    echo "  api    - API branch instance"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo "  --proxy          Enable proxy_git before starting"
    echo "  --no-attach      Don't attach to tmux session"
    echo "  --register-only  Only register, don't start Claude"
    echo "  --custom-path    Use custom path instead of default"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 main --proxy"
    echo "  $0 ui --no-attach"
    echo "  $0 api --register-only"
    echo "  $0 main --custom-path /path/to/project"
    echo ""
    echo -e "${YELLOW}CLI Tool Commands:${NC}"
    echo "  claude-chat register <path> <role>   # Register instance"
    echo "  claude-chat start <path> <role>      # Start instance"
    echo "  claude-chat status                   # Show status"
    echo "  claude-chat list                     # List instances"
    echo "  claude-chat router --start           # Start router"
    echo ""
    exit 0
fi

# Validate instance type
if [[ ! "${INSTANCE_CONFIGS[$INSTANCE_TYPE]:-}" ]]; then
    echo -e "${RED}❌ Error: Unknown instance type '$INSTANCE_TYPE'${NC}"
    echo "Available types: ${!INSTANCE_CONFIGS[@]}"
    exit 1
fi

# Parse options
ENABLE_PROXY=false
NO_ATTACH=false
REGISTER_ONLY=false
CUSTOM_PATH=""

while [[ $# -gt 1 ]]; do
    case $2 in
        --proxy)
            ENABLE_PROXY=true
            shift
            ;;
        --no-attach)
            NO_ATTACH=true
            shift
            ;;
        --register-only)
            REGISTER_ONLY=true
            shift
            ;;
        --custom-path)
            CUSTOM_PATH="$3"
            shift 2
            ;;
        *)
            echo -e "${YELLOW}⚠️ Unknown option: $2${NC}"
            shift
            ;;
    esac
done

# Determine work directory
if [[ -n "$CUSTOM_PATH" ]]; then
    WORK_DIR="$CUSTOM_PATH"
else
    WORK_DIR="${INSTANCE_CONFIGS[$INSTANCE_TYPE]}"
fi

# Validate work directory
if [[ ! -d "$WORK_DIR" ]]; then
    echo -e "${RED}❌ Error: Work directory '$WORK_DIR' does not exist${NC}"
    exit 1
fi

echo -e "${PURPLE}🎯 Starting $INSTANCE_TYPE Claude Instance${NC}"
echo -e "${BLUE}📁 Work Directory: $WORK_DIR${NC}"

# Enable proxy if requested
if [[ "$ENABLE_PROXY" == "true" ]]; then
    echo -e "${BLUE}🔧 Enabling proxy...${NC}"
    if load_proxy; then
        echo -e "${GREEN}✅ Proxy enabled${NC}"
    else
        echo -e "${YELLOW}⚠️ Proxy not available, continuing...${NC}"
    fi
fi

# Check if claude-chat CLI is available
if ! command -v claude-chat &> /dev/null; then
    echo -e "${BLUE}🔧 Building claude-chat CLI...${NC}"
    
    # Try to find the claude-chat project directory
    CLAUDE_CHAT_DIR=""
    if [[ -f "package.json" ]] && grep -q "claude-chat" package.json; then
        CLAUDE_CHAT_DIR="$(pwd)"
    elif [[ -d "/Users/ghostcorn/dev/claude-chat" ]]; then
        CLAUDE_CHAT_DIR="/Users/ghostcorn/dev/claude-chat"
    else
        echo -e "${RED}❌ Error: claude-chat project not found${NC}"
        echo "Please ensure the claude-chat project is available and built"
        exit 1
    fi
    
    cd "$CLAUDE_CHAT_DIR"
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    bun install
    
    echo -e "${BLUE}🔨 Building CLI...${NC}"
    bun run build:cli
    
    echo -e "${BLUE}🔧 Making CLI executable...${NC}"
    chmod +x ./dist/cli.js
    
    # Add to PATH for this session
    export PATH="$CLAUDE_CHAT_DIR/dist:$PATH"
    
    echo -e "${GREEN}✅ CLI ready${NC}"
fi

# Register only mode
if [[ "$REGISTER_ONLY" == "true" ]]; then
    echo -e "${BLUE}📝 Registering instance only...${NC}"
    claude-chat register "$WORK_DIR" "$INSTANCE_TYPE"
    echo -e "${GREEN}✅ Instance registered${NC}"
    exit 0
fi

# Build start command options
START_OPTIONS=""
if [[ "$ENABLE_PROXY" == "true" ]]; then
    START_OPTIONS="$START_OPTIONS --proxy"
fi
if [[ "$NO_ATTACH" == "true" ]]; then
    START_OPTIONS="$START_OPTIONS --no-attach"
fi

# Start the instance using CLI
echo -e "${BLUE}🚀 Starting Claude instance...${NC}"
claude-chat start "$WORK_DIR" "$INSTANCE_TYPE" $START_OPTIONS

echo -e "${GREEN}✅ Done!${NC}"
