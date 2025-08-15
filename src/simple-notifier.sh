#!/bin/bash

# 🤖 Claude tmux Message Notifier - Minimal Version
# Only focuses on the send_message functionality

# Core send_message function
send_message() {
    local to="$1"
    local content="$2"
    local type="${3:-message}"
    
    # Support configurable router URL
    local router_host="${CLAUDE_CHAT_HOST:-localhost}"
    local router_port="${CLAUDE_CHAT_PORT:-3333}"
    local router_url="${CLAUDE_ROUTER_URL:-http://${router_host}:${router_port}/message}"
    local from="${CLAUDE_INSTANCE_NAME:-$(basename $PWD)}"
    
    curl -s -X POST "$router_url" \
        -H "Content-Type: application/json" \
        -d "{
            \"from\": \"$from\",
            \"to\": \"$to\",
            \"content\": \"$content\",
            \"type\": \"$type\"
        }" 2>/dev/null && echo "✅ Message sent" || echo "❌ Send failed"
}

# Usage examples (comment out when not needed):
# send_message "main" "Task completed"
# send_message "ui" "Please review the changes" "request"
# send_message "api" "Database updated" "info"

# Auto-send completion message if called as hook
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # This script is being executed directly (not sourced)
    MESSAGE="${CLAUDE_LAST_MESSAGE:-Task completed}"
    TARGET="${CLAUDE_MESSAGE_TARGET:-main}"
    ROLE="${CLAUDE_INSTANCE_ROLE:-}"
    
    # Only send if not main instance
    if [[ "$ROLE" != "main" ]]; then
        send_message "$TARGET" "$MESSAGE" "completion"
    fi
fi
