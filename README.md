# Claude Chat CLI

A powerful command-line tool for managing Claude instances with real-time chat interface, automatic setup, message routing, and tmux integration.

## ⚠️ **IMPORTANT WARNING**

**This project is for personal research and experimentation only. DO NOT use it in actual coding work or production environments.**

This tool uses the `--dangerously-skip-permissions` flag to achieve smooth chat functionality, which poses significant security risks:

- ⚠️ **File Loss Risk**: Improper operation may result in project file loss
- ⚠️ **Unauthorized Modifications**: Files may be modified without explicit permission
- ⚠️ **Production Risk**: Absolutely NOT suitable for any formal production environment
- ⚠️ **Security Concerns**: Bypasses safety mechanisms that protect your codebase

**DISCLAIMER**: The authors and contributors of this project are not responsible for any damage, data loss, security breaches, or other issues that may arise from using this tool. Use at your own risk and only in isolated, non-critical environments.

---

## ✨ Key Features

- 🚀 **One-Command Setup**: `claude-chat start <path> <role>` - does everything automatically
- 💬 **Real-time Chat Interface**: Web-based chat UI for communicating with Claude instances
- 📡 **WebSocket Support**: Real-time messaging with live updates
- 🔧 **Auto-Initialization**: Automatically sets up hooks, documentation, and configuration
- 📡 **Message Router**: HTTP-based communication between Claude instances
- 🖥️ **tmux Integration**: Seamless session management with environment setup
- ⚙️ **Flexible Configuration**: Environment variables and persistent settings
- 🔄 **Smart Proxy Support**: Integrated proxy setup for network access
- 📝 **VS Code Hooks**: Automatic integration with Claude's event system
- 👥 **Multi-Instance Support**: Manage multiple Claude instances simultaneously

## 🚀 Quick Start

### Prerequisites

Make sure you have the required tools installed:

**tmux Installation:**
```bash
# macOS (Homebrew)
brew install tmux

# Ubuntu/Debian
sudo apt-get install tmux

# CentOS/RHEL/Fedora
sudo dnf install tmux
```

**Bun Runtime:**
```bash
curl -fsSL https://bun.sh/install | bash
```

### Installation

```bash
# Global installation (recommended)
npm install -g claude-chat

# Or install from source
git clone https://github.com/neeboo/claude-chat.git
cd claude-chat
bun install && bun run build && bun link
```

### One-Command Usage (Recommended)

The fastest way to get started - everything is automatic:

```bash
# Start a Claude instance (auto-setup everything)
claude-chat start /path/to/your/project main

# Start additional instances for different roles
claude-chat start /path/to/frontend ui --no-attach
claude-chat start /path/to/backend api --no-attach --proxy

# That's it! No manual setup needed.
```

This single command automatically:
1. ✅ Initializes the project with Claude Chat protocol
2. ✅ Sets up VS Code hooks and configuration  
3. ✅ Starts the message router if needed
4. ✅ Creates and configures tmux session
5. ✅ Registers the instance with the router
6. ✅ Launches Claude with proper environment variables
7. ✅ Connects you to the tmux session

## 💬 Real-time Chat Interface

Access the web-based chat interface to communicate with all your Claude instances in real-time:

### Opening the Chat Interface

```bash
# Open chat interface automatically
claude-chat chat

# Or manually visit: http://localhost:8888/chat
```

### Chat Features

- 🗨️ **Group Chat Experience**: Chat with all Claude instances like a group conversation
- 🎯 **Targeted Messaging**: Send messages to specific instances using @mentions
- 📢 **Broadcast Messages**: Use @all to send messages to all instances
- ⏰ **Real-time Updates**: Instant message delivery via WebSocket
- 📜 **Message History**: Persistent chat history with timestamps
- 👤 **Instance Status**: Live display of online Claude instances
- 🔄 **Auto-reconnection**: Automatic reconnection on connection loss

### Chat Interface Usage

1. **Send to all instances**: Select `@all` (default) and type your message
2. **Send to specific instance**: Select `@InstanceName` from the dropdown
3. **View conversations**: All messages appear in real-time with sender info
4. **Monitor instances**: Left sidebar shows all connected Claude instances

## 📋 Command Reference

### Main Commands

```bash
# Start a Claude instance with chat support (recommended - all-in-one)
claude-chat start <path> <role> [options]

# Open the real-time chat interface
claude-chat chat [--port <port>]

# Manual setup commands (optional)
claude-chat init <path>           # Initialize project only
claude-chat register <path> <role> # Register instance only
claude-chat router --start        # Start router only

# Status and management
claude-chat status               # Show all instances and router status
claude-chat list                # List registered instances
claude-chat config --show       # Show current configuration
```

### Start Command Options

The `start` command supports many options for customization:

```bash
claude-chat start <path> <role> [options]

# Basic options
-n, --name <name>        # Custom instance name
-s, --session <session>  # Custom tmux session name  
--no-attach             # Start in background (don't attach to tmux)

# Proxy options
--proxy                 # Enable proxy with your configured settings

# Initialization options
--no-init               # Skip automatic project initialization
--force-init            # Force overwrite existing init files
--hooks-only            # Only setup hooks during init
--docs-only             # Only setup documentation during init
```

### Chat Command Options

```bash
claude-chat chat [options]

# Options
--port <port>           # Override router port (default: from config)
```

### Example Usage Patterns

```bash
# Standard development setup with chat
claude-chat start ~/dev/my-app main

# Start UI instance in background with proxy
claude-chat start ~/dev/frontend ui --no-attach --proxy

# Start API instance with custom name
claude-chat start ~/dev/backend api --name "API Server" --no-attach

# Open chat interface
claude-chat chat

# Force reinitialize an existing project
claude-chat start ~/dev/old-project main --force-init

# Start without auto-initialization
claude-chat start ~/dev/minimal-project main --no-init
```

## ⚙️ Configuration

### Environment Variables

Override default settings with environment variables:

```bash
# Temporary override for one command
CLAUDE_CHAT_PORT=8080 claude-chat start ~/project main

# Set in your shell profile for permanent changes
export CLAUDE_CHAT_HOST=192.168.1.100
export CLAUDE_CHAT_PORT=9999
export PROXY_HOST=127.0.0.1
export PROXY_PORT=7893
```

Supported environment variables:
- `CLAUDE_CHAT_HOST` - Router host (default: localhost)
- `CLAUDE_CHAT_PORT` - Router port (default: 8888)  
- `CLAUDE_ROUTER_URL` - Complete router URL override
- `PROXY_HOST` - Proxy server host (default: 127.0.0.1)
- `PROXY_PORT` - Proxy server port (default: 7893)

### Persistent Configuration

```bash
# Show current settings
claude-chat config --show

# Change default port
claude-chat config --set-port 8080

# Change default host  
claude-chat config --set-host 192.168.1.100

# Reset to defaults
claude-chat config --reset
```

## 📁 What Gets Created

When you run `claude-chat start` for the first time in a project, it creates:

```
your-project/
├── .claude/
│   ├── hooks/
│   │   └── simple-notifier.sh    # Message notification script
│   └── settings.local.json       # VS Code hook configuration
└── CLAUDE.md                     # Communication protocol documentation
```

## 🔄 Multi-Instance Workflow with Chat

Perfect for complex projects with multiple Claude instances:

```bash
# Terminal 1: Start main instance (stays attached)
claude-chat start ~/dev/my-app main

# Terminal 2: Start supporting instances (background)
claude-chat start ~/dev/my-app ui --no-attach
claude-chat start ~/dev/my-app api --no-attach --proxy
claude-chat start ~/dev/my-app docs --no-attach

# Terminal 3: Open chat interface for group communication
claude-chat chat

# Check status
claude-chat status
```

Now you can:
- Chat with all instances via the web interface
- Send targeted messages to specific instances
- Monitor real-time conversations
- Keep track of all instance activities

## 🌐 Message Router API

The built-in HTTP API enables both programmatic and chat interface communication:

### REST Endpoints

```bash
# Send message between instances (programmatic)
curl -X POST http://localhost:8888/message \
  -H "Content-Type: application/json" \
  -d '{"from": "ui", "to": "main", "content": "Task completed"}'

# Check router health
curl http://localhost:8888/health

# View all instances
curl http://localhost:8888/status  

# View message history
curl http://localhost:8888/messages

# Access chat interface
curl http://localhost:8888/chat
```

### WebSocket Support

The chat interface uses WebSocket for real-time communication:

```javascript
// WebSocket endpoint
ws://localhost:8888/

// Message format
{
  "type": "send_message",
  "from": "human",
  "to": "instance_id", // or "all"
  "content": "Hello Claude!"
}
```

## 🛠️ Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Check what's using the port
lsof -i :8888

# Use a different port
claude-chat config --set-port 8080
claude-chat start ~/project main
```

**Chat interface not loading:**
```bash
# Check if router is running
claude-chat status

# Restart router
claude-chat router --restart

# Check browser console for WebSocket errors
```

**tmux not found:**
```bash
# Install tmux first
brew install tmux  # macOS
sudo apt install tmux  # Ubuntu
```

**Proxy not working:**
```bash
# Check your proxy settings
echo $PROXY_HOST $PROXY_PORT

# Start with proxy enabled
claude-chat start ~/project main --proxy
```

**VS Code hooks not working:**
```bash
# Check if files were created
ls -la .claude/

# Verify script permissions
chmod +x .claude/hooks/simple-notifier.sh
```

**WebSocket connection failed:**
```bash
# Check firewall settings
# Ensure port 8888 is not blocked
# Try different port: claude-chat config --set-port 9999
```

### Debug Mode

```bash
# Run with verbose output
DEBUG=1 claude-chat start ~/project main

# Check router logs
claude-chat status

# Monitor WebSocket connections in browser dev tools
```

## 📖 Project Structure

```
claude-chat/
├── src/
│   ├── index.ts              # Message router server with WebSocket support
│   ├── cli.ts                # CLI interface with chat commands
│   ├── config.ts             # Configuration management
│   ├── CLAUDE_TEMPLATE.md    # Protocol template
│   └── simple-notifier.sh    # Notification script template
├── dist/                     # Built files
├── package.json
└── README.md
```

## 🔒 Security Considerations

### Important Reminders

- ⚠️ **Research Use Only**: This tool is designed for personal experimentation
- 🔒 **Permission Bypass**: Uses `--dangerously-skip-permissions` for functionality
- 🚫 **No Production Use**: Never use in production or critical environments
- 💾 **Backup Important Data**: Always backup your projects before use
- 🔍 **Monitor Activities**: Watch for unexpected file changes
- 🛡️ **Isolated Environment**: Use in sandboxed or test environments only

### Best Practices

1. **Use in isolated directories**: Don't run on important projects
2. **Regular backups**: Backup your work frequently
3. **Monitor file changes**: Use git to track modifications
4. **Limited scope**: Only use for experimental coding tasks
5. **Network isolation**: Consider using in offline environments

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`  
3. Make your changes and test thoroughly
4. Ensure security considerations are addressed
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**neeboo**
- GitHub: [@neeboo](https://github.com/neeboo)
- Repository: [claude-chat](https://github.com/neeboo/claude-chat)

## ⚖️ Disclaimer

**USE AT YOUR OWN RISK**: This software is provided "as is" without warranty of any kind. The authors and contributors shall not be liable for any damages, data loss, security breaches, or other issues arising from the use of this tool. Users are responsible for understanding the risks and using the tool only in appropriate, non-critical environments.

---

⚠️ **Remember: This tool is for research and experimentation only. Always prioritize safety and security in your development workflow.**
