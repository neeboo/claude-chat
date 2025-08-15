#!/bin/bash

# Claude Chat CLI Installation Script

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Installing Claude Chat CLI${NC}"

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}❌ Error: Bun is not installed${NC}"
    echo "Please install Bun first: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
bun install

# Build the project
echo -e "${BLUE}🔨 Building project...${NC}"
bun run build

# Make CLI executable
echo -e "${BLUE}🔧 Setting up CLI...${NC}"
chmod +x ./dist/cli.js

# Create symlink for global access (optional)
CLI_PATH="./dist/cli.js"
GLOBAL_PATH="/usr/local/bin/claude-chat"

if [[ -w "/usr/local/bin" ]]; then
    echo -e "${BLUE}🔗 Creating global symlink...${NC}"
    ln -sf "$(pwd)/dist/cli.js" "$GLOBAL_PATH"
    echo -e "${GREEN}✅ Global command 'claude-chat' is now available${NC}"
else
    echo -e "${YELLOW}⚠️ Cannot create global symlink (no write permission to /usr/local/bin)${NC}"
    echo -e "${YELLOW}💡 You can run the CLI using: $(pwd)/dist/cli.js${NC}"
    echo -e "${YELLOW}💡 Or add $(pwd)/dist to your PATH${NC}"
fi

# Make scripts executable
chmod +x ./start-claude-enhanced.sh

echo ""
echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
echo -e "${YELLOW}Quick Start:${NC}"
echo "1. Start the message router:"
echo "   claude-chat router --start"
echo ""
echo "2. Register and start a Claude instance:"
echo "   claude-chat start /path/to/project main"
echo ""
echo "3. Or use the enhanced script:"
echo "   ./start-claude-enhanced.sh main"
echo ""
echo -e "${YELLOW}Available Commands:${NC}"
echo "  claude-chat register <path> <role>   # Register an instance"
echo "  claude-chat start <path> <role>      # Start an instance with tmux"
echo "  claude-chat status                   # Show router status"
echo "  claude-chat list                     # List all instances"
echo "  claude-chat router --start/--stop    # Manage router"
echo ""
echo -e "${BLUE}📖 For more help: claude-chat --help${NC}"
