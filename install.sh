#!/bin/bash

# Claude Chat CLI Installation Script
# This script automatically installs all dependencies and sets up claude-chat

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command_exists apt-get; then
            echo "ubuntu"
        elif command_exists yum; then
            echo "centos"
        elif command_exists dnf; then
            echo "fedora"
        else
            echo "linux"
        fi
    else
        echo "unknown"
    fi
}

# Install tmux based on OS
install_tmux() {
    local os=$(detect_os)
    
    print_status "Installing tmux..."
    
    case $os in
        "macos")
            if command_exists brew; then
                brew install tmux
            else
                print_error "Homebrew not found. Please install Homebrew first:"
                print_error "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
                exit 1
            fi
            ;;
        "ubuntu")
            sudo apt-get update && sudo apt-get install -y tmux
            ;;
        "centos")
            sudo yum install -y tmux
            ;;
        "fedora")
            sudo dnf install -y tmux
            ;;
        *)
            print_error "Unsupported OS. Please install tmux manually."
            exit 1
            ;;
    esac
    
    print_success "tmux installed successfully"
}

# Install Bun
install_bun() {
    print_status "Installing Bun runtime..."
    
    if command_exists curl; then
        curl -fsSL https://bun.sh/install | bash
        
        # Add bun to PATH for current session
        export PATH="$HOME/.bun/bin:$PATH"
        
        # Add to shell profile
        if [[ -f "$HOME/.zshrc" ]]; then
            if ! grep -q 'export PATH="$HOME/.bun/bin:$PATH"' "$HOME/.zshrc"; then
                echo 'export PATH="$HOME/.bun/bin:$PATH"' >> "$HOME/.zshrc"
            fi
        elif [[ -f "$HOME/.bashrc" ]]; then
            if ! grep -q 'export PATH="$HOME/.bun/bin:$PATH"' "$HOME/.bashrc"; then
                echo 'export PATH="$HOME/.bun/bin:$PATH"' >> "$HOME/.bashrc"
            fi
        fi
        
        print_success "Bun installed successfully"
    else
        print_error "curl not found. Please install curl first."
        exit 1
    fi
}

# Build and install claude-chat from source
build_claude_chat() {
    print_status "Building claude-chat from source..."
    
    # Use bun from the correct path
    local bun_cmd="bun"
    if [[ -f "$HOME/.bun/bin/bun" ]]; then
        bun_cmd="$HOME/.bun/bin/bun"
    fi
    
    # Install dependencies
    print_status "Installing dependencies..."
    $bun_cmd install
    
    # Build the project
    print_status "Building project..."
    $bun_cmd run build
    
    # Make CLI executable
    chmod +x ./dist/cli.js
    
    # Try to create global symlink
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local cli_path="$script_dir/dist/cli.js"
    
    if [[ -w "/usr/local/bin" ]] || sudo -n true 2>/dev/null; then
        print_status "Creating global symlink..."
        if [[ -w "/usr/local/bin" ]]; then
            ln -sf "$cli_path" "/usr/local/bin/claude-chat"
        else
            sudo ln -sf "$cli_path" "/usr/local/bin/claude-chat"
        fi
        print_success "Global command 'claude-chat' is now available"
    else
        print_warning "Cannot create global symlink (no sudo access)"
        print_warning "You can run the CLI using: $cli_path"
        print_warning "Or add $script_dir/dist to your PATH"
    fi
    
    print_success "claude-chat built successfully"
}

# Verify installation
verify_installation() {
    print_status "Verifying installation..."
    
    local all_good=true
    
    # Check tmux
    if command_exists tmux; then
        print_success "✓ tmux is available ($(tmux -V))"
    else
        print_error "✗ tmux not found"
        all_good=false
    fi
    
    # Check bun
    if command_exists bun || command_exists "$HOME/.bun/bin/bun"; then
        local bun_version
        if command_exists bun; then
            bun_version=$(bun --version 2>/dev/null || echo "unknown")
        else
            bun_version=$("$HOME/.bun/bin/bun" --version 2>/dev/null || echo "unknown")
        fi
        print_success "✓ Bun is available (v$bun_version)"
    else
        print_error "✗ Bun not found"
        all_good=false
    fi
    
    # Check claude-chat
    if command_exists claude-chat; then
        print_success "✓ claude-chat is available globally"
    elif [[ -f "./dist/cli.js" ]]; then
        print_success "✓ claude-chat is available locally (./dist/cli.js)"
    else
        print_error "✗ claude-chat not found"
        all_good=false
    fi
    
    if [[ "$all_good" == "true" ]]; then
        return 0
    else
        return 1
    fi
}

# Show post-installation instructions
show_quick_start() {
    echo ""
    echo -e "${GREEN}🎉 Installation completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${BLUE}           Quick Start Guide               ${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
    echo -e "${GREEN}1. Start a Claude instance (one command does it all):${NC}"
    echo "   claude-chat start /path/to/your/project main"
    echo ""
    echo -e "${GREEN}2. Open the real-time chat interface:${NC}"
    echo "   claude-chat chat"
    echo "   Or visit: http://localhost:8888/chat"
    echo ""
    echo -e "${GREEN}3. Check status:${NC}"
    echo "   claude-chat status"
    echo ""
    echo -e "${YELLOW}Advanced Usage:${NC}"
    echo "   claude-chat start ~/frontend ui --no-attach --proxy"
    echo "   claude-chat config --show"
    echo "   claude-chat --help"
    echo ""
    echo -e "${BLUE}Documentation:${NC} https://github.com/neeboo/claude-chat"
    echo ""
}

# Main installation function
main() {
    echo ""
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${BLUE}    Claude Chat CLI Installation Script    ${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
    
    print_warning "⚠️  IMPORTANT: This tool is for personal research only!"
    print_warning "    Do NOT use in production environments."
    echo ""
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]] || [[ ! -f "src/cli.ts" ]]; then
        print_error "Please run this script from the claude-chat project directory"
        exit 1
    fi
    
    # Check prerequisites
    print_status "Checking system requirements..."
    
    # Check if tmux is already installed
    if command_exists tmux; then
        print_success "✓ tmux is already installed"
    else
        install_tmux
    fi
    
    # Check if bun is already installed
    if command_exists bun || command_exists "$HOME/.bun/bin/bun"; then
        print_success "✓ Bun is already installed"
    else
        install_bun
        # Source the new PATH
        if [[ -f "$HOME/.zshrc" ]]; then
            source "$HOME/.zshrc" 2>/dev/null || true
        elif [[ -f "$HOME/.bashrc" ]]; then
            source "$HOME/.bashrc" 2>/dev/null || true
        fi
    fi
    
    echo ""
    print_status "Building claude-chat..."
    
    build_claude_chat
    
    echo ""
    print_status "Verifying installation..."
    
    if verify_installation; then
        show_quick_start
    else
        print_error "Installation verification failed!"
        echo ""
        echo "Please check the errors above and try manual installation:"
        echo "  1. Install tmux: brew install tmux (macOS) or apt install tmux (Linux)"
        echo "  2. Install Bun: curl -fsSL https://bun.sh/install | bash"
        echo "  3. Build project: bun install && bun run build"
        echo ""
        exit 1
    fi
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
