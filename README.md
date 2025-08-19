# Claude Chat CLI

Real-time chat interface for multiple Claude instances with automatic setup and message routing.

## ⚠️ **WARNING**

**For personal research only. NOT for production use.**

Uses `--dangerously-skip-permissions` - may cause file loss or unauthorized modifications. Use at your own risk in isolated environments only.

---

## 🚀 Quick Start

```bash
# 1. Install and run server
curl -fsSL https://raw.githubusercontent.com/neeboo/claude-chat/main/install.sh | bash

# 2. Start instance A
claude-chat start ~/folder-a main

# 3. Start instance B (in another terminal and another folder)
claude-chat start ~/folder-b assistant --no-attach

# 4. Open chat interface
open http://localhost:8888/chat
```

**That's it!** Start chatting with your Claude instances in real-time.

## ✨ Features

-  **Real-time Chat**: Web interface for group conversations
- � **One-Command Setup**: Auto-configures everything
- 👥 **Multi-Instance**: Manage multiple Claude instances
- � **Message Routing**: Instances can communicate with each other
- ⚙️ **Flexible Config**: Environment variables and settings

## 📋 Commands

```bash
claude-chat start <path> <role>     # Start a Claude instance
claude-chat chat                    # Open chat interface
claude-chat status                  # Show all instances
claude-chat config --show           # View configuration
```

## 🔧 Configuration

```bash
# Change port
claude-chat config --set-port 9999

# Environment variables
export CLAUDE_CHAT_PORT=8888
export CLAUDE_CHAT_HOST=localhost
```

## 🌐 API

- Chat Interface: `http://localhost:8888/chat`
- WebSocket: `ws://localhost:8888`
- Status: `http://localhost:8888/status`
- Health: `http://localhost:8888/health`

## � Chat Features

- **@all** - Broadcast to all instances
- **@specific** - Message individual instances  
- **Real-time updates** - Live message delivery
- **Message history** - Persistent conversations

## 🛠️ Manual Install

```bash
git clone https://github.com/neeboo/claude-chat.git
cd claude-chat
./install.sh
```

## 📄 License

MIT License - [@neeboo](https://github.com/neeboo)

---

⚠️ **Remember: Research use only. Not for production environments.**
