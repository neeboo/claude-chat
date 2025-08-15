# Claude Chat

A flexible message routing service for Claude instances with tmux integration and VS Code hooks.

## Features

- 🚀 **Message Router**: HTTP-based message routing between Claude instances
- 🔧 **CLI Tools**: Complete command-line interface for managing instances
- � **Template System**: Auto-generates communication protocol templates
- ⚙️ **Configurable**: Flexible port and host configuration with environment variable support
- 🔄 **Environment Variables**: Runtime configuration overrides
- 🖥️ **VS Code Integration**: Seamless integration with VS Code hooks and tmux sessions
- � **Cross-Instance Communication**: Enable multiple Claude instances to collaborate

## Prerequisites

### tmux Installation

This tool requires tmux for session management. Install it on your system:

**macOS:**
```bash
# Using Homebrew
brew install tmux

# Using MacPorts
sudo port install tmux
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install tmux
```

**Linux (CentOS/RHEL/Fedora):**
```bash
# CentOS/RHEL
sudo yum install tmux
# or
sudo dnf install tmux

# Fedora
sudo dnf install tmux
```

**Windows:**
```bash
# Using WSL (Windows Subsystem for Linux)
sudo apt-get install tmux

# Using Scoop
scoop install tmux
```

### tmux Quick Start

If you're new to tmux, here are the basics:

```bash
# Start a new tmux session
tmux new-session -s my-session

# List all sessions
tmux list-sessions

# Attach to an existing session
tmux attach-session -t my-session

# Detach from current session (inside tmux)
Ctrl+b, then d

# Kill a session
tmux kill-session -t my-session
```
- 🛠️ **CLI Tools**: Command-line interface for easy management

## Supported Environments

- VS Code terminal mode
- VS Code hybrid mode (with tmux integration)
- Pure tmux session mode
- Traditional tmux pane/window mode

## Installation

### Global Installation (Recommended)

```bash
npm install -g claude-chat
```

### Local Development Installation

```bash
git clone https://github.com/neeboo/claude-chat.git
cd claude-chat
bun install
bun run build
bun link
```

### Verify Installation

```bash
claude-chat --version
claude-chat --help
```

## Quick Start

## Configuration

### Environment Variables

Claude Chat supports flexible configuration through environment variables:

- `CLAUDE_CHAT_HOST` - Router host (default: localhost)
- `CLAUDE_CHAT_PORT` - Router port (default: 3333)
- `CLAUDE_ROUTER_URL` - Complete router URL override

### Configuration Commands

```bash
# Show current configuration
claude-chat config --show

# Set custom port (persistent)
claude-chat config --set-port 8080

# Set custom host (persistent)
claude-chat config --set-host 192.168.1.100

# Reset to defaults
claude-chat config --reset
```

### Temporary Configuration Override

```bash
# Use environment variables for one-time override
CLAUDE_CHAT_PORT=9999 claude-chat router --start
CLAUDE_CHAT_HOST=192.168.1.100 claude-chat status
```

### 2. Start the Message Router

```bash
claude-chat router --start
```

### 3. Initialize a Project

This creates VS Code hooks and communication templates:

```bash
claude-chat init /path/to/your/project
```

### 4. Register an Instance

```bash
claude-chat register /path/to/your/project main
```

### 5. Check Status

```bash
claude-chat status
claude-chat list
```

### Prerequisites

Ensure Bun is installed:

```bash
curl -fsSL https://bun.sh/install | bash
```

### Quick Install

```bash
chmod +x install.sh
./install.sh
```

### Manual Installation

```bash
# Install dependencies
bun install

# Build the project
bun run build

# Make CLI executable
chmod +x ./dist/cli.js

# Optional: Create global symlink
sudo ln -sf $(pwd)/dist/cli.js /usr/local/bin/claude-chat
```

## Usage

### CLI Commands

#### Initialize a Project

Before using Claude Chat protocol in a project, initialize it with communication hooks and documentation:

```bash
# Initialize Claude Chat protocol for a project
claude-chat init /path/to/project

# Only setup hooks (skip documentation)
claude-chat init /path/to/project --hooks-only

# Only setup documentation (skip hooks)
claude-chat init /path/to/project --docs-only

# Force overwrite existing files
claude-chat init /path/to/project --force
```

This command will:
- Create `.claude/hooks/` directory with `simple-notifier.sh`
- Update or create `settings.local.json` with Stop event hook
- Append Claude Chat protocol to `CLAUDE.md` (or create it)

#### Start Message Router

```bash
claude-chat router --start
```

#### Register a Claude Instance

```bash
claude-chat register /path/to/project main
claude-chat register /path/to/ui-project ui --name "UI Development"
```

#### Start a Claude Instance with Tmux

```bash
# Start and attach to tmux session
claude-chat start /path/to/project main

# Start in background (no attach)
claude-chat start /path/to/project api --no-attach

# Start with proxy enabled
claude-chat start /path/to/project ui --proxy
```

#### Check Status

```bash
# Show router and instances status
claude-chat status

# List all registered instances
claude-chat list
```

#### Router Management

```bash
# Start router
claude-chat router --start

# Stop router
claude-chat router --stop

# Restart router
claude-chat router --restart
```

### Enhanced Script Usage

The `start-claude-enhanced.sh` script provides a wrapper around the CLI with predefined configurations:

```bash
# Start main instance
./start-claude-enhanced.sh main

# Start with proxy enabled
./start-claude-enhanced.sh ui --proxy

# Start in background
./start-claude-enhanced.sh api --no-attach

# Register only (don't start Claude)
./start-claude-enhanced.sh main --register-only

# Use custom path
./start-claude-enhanced.sh main --custom-path /path/to/custom/project
```

### Development Mode

Start the router in development mode with auto-reload:

```bash
bun dev
```

### Production Mode

```bash
bun start
```

### Build

```bash
bun run build
```

## API Endpoints

### Register Instance

```bash
curl -X POST http://localhost:3333/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": "claude-1",
    "name": "Claude Assistant",
    "role": "main",
    "tmuxSession": "claude-session",
    "windowType": "tmux-session"
  }'
```

### Send Message

```bash
curl -X POST http://localhost:3333/message \
  -H "Content-Type: application/json" \
  -d '{
    "from": "user",
    "to": "claude-1",
    "content": "Hello Claude!",
    "type": "message"
  }'
```

### Check Status

```bash
curl http://localhost:3333/status
```

### Health Check

```bash
curl http://localhost:3333/health
```

### View Message History

```bash
curl http://localhost:3333/messages
```

## CLI Command Reference

```bash
# Display help
claude-chat --help

# Initialize project
claude-chat init <path> [options]
  Options:
    --force                  Force overwrite existing files
    --hooks-only            Only setup hooks, skip documentation
    --docs-only             Only setup documentation, skip hooks

# Register commands
claude-chat register <path> <role> [options]
  Options:
    -n, --name <name>        Custom instance name
    -s, --session <session>  Custom tmux session name
    -t, --type <type>        Window type (default: tmux-session)
    --router-url <url>       Router URL (default: http://localhost:3333)

# Start commands
claude-chat start <path> <role> [options]
  Options:
    -n, --name <name>        Custom instance name
    -s, --session <session>  Custom tmux session name
    --proxy                  Enable proxy_git before starting
    --no-attach             Don't attach to tmux session

# Status commands
claude-chat status          # Show detailed status
claude-chat list           # List all instances

# Router management
claude-chat router --start    # Start router
claude-chat router --stop     # Stop router
claude-chat router --restart  # Restart router
```

## Development

### Code Formatting

```bash
bun run format
```

### Code Linting

```bash
bun run lint
```

### Type Checking

```bash
bun run type-check
```

### Testing

```bash
bun test
```

## Project Structure

```
claude-chat/
├── src/
│   ├── index.ts              # Main router application
│   └── cli.ts                # CLI tool
├── dist/                     # Build output
├── start-claude-enhanced.sh  # Enhanced startup script
├── install.sh               # Installation script
├── package.json             # Project configuration
├── tsconfig.json            # TypeScript configuration
├── .eslintrc.js             # ESLint configuration
├── .prettierrc              # Prettier configuration
├── .gitignore               # Git ignore rules
└── README.md                # Project documentation
```

## Examples

### Basic Workflow

1. **Install and setup**:
   ```bash
   ./install.sh
   ```

2. **Initialize your project directories**:
   ```bash
   claude-chat init /Users/username/dev/my-project
   claude-chat init /Users/username/dev/ui-project
   claude-chat init /Users/username/dev/api-project
   ```

3. **Start the router**:
   ```bash
   claude-chat router --start
   ```

4. **Start a main Claude instance**:
   ```bash
   claude-chat start /Users/username/dev/my-project main
   ```

5. **Start additional instances**:
   ```bash
   claude-chat start /Users/username/dev/ui-project ui --no-attach
   claude-chat start /Users/username/dev/api-project api --no-attach
   ```

6. **Check status**:
   ```bash
   claude-chat status
   ```

### Project Initialization Options

```bash
# Full setup (hooks + documentation)
claude-chat init /path/to/project

# Only setup communication hooks
claude-chat init /path/to/project --hooks-only

# Only setup protocol documentation
claude-chat init /path/to/project --docs-only

# Force overwrite existing files
claude-chat init /path/to/project --force
```

### Custom Configuration

You can modify the default configurations in `start-claude-enhanced.sh` or use the CLI directly with custom paths:

```bash
# Custom project paths
claude-chat init /path/to/frontend
claude-chat start /path/to/frontend frontend

claude-chat init /path/to/backend  
claude-chat start /path/to/backend backend

claude-chat init /path/to/mobile
claude-chat start /path/to/mobile mobile
```

## VS Code Integration

After running `claude-chat init`, your project will have:

1. **VS Code Hooks**: Automatically set up in `settings.local.json`
2. **Notification Script**: Located at `.claude/hooks/simple-notifier.sh`
3. **Documentation**: `CLAUDE.md` with communication protocols

## How It Works

1. **Message Router**: Central HTTP service that routes messages between Claude instances
2. **Instance Registration**: Each Claude session registers with the router
3. **VS Code Hooks**: Trigger notifications when you stop interacting with Claude
4. **tmux Integration**: Manages different Claude sessions in separate tmux windows
5. **Flexible Configuration**: Adapts to different environments and port configurations

## Troubleshooting

### Router Not Starting

1. Check if port is already in use:
   ```bash
   lsof -i :3333
   ```

2. Try a different port:
   ```bash
   claude-chat config --set-port 8080
   claude-chat router --restart
   ```

### tmux Issues

1. Make sure tmux is installed and accessible:
   ```bash
   which tmux
   tmux -V
   ```

2. If tmux command not found, install it (see Prerequisites section above)

### VS Code Hooks Not Working

1. Check if `settings.local.json` exists in your project
2. Verify the hook script is executable:
   ```bash
   chmod +x .claude/hooks/simple-notifier.sh
   ```

### Configuration Issues

1. Show current configuration:
   ```bash
   claude-chat config --show
   ```

2. Reset to defaults if needed:
   ```bash
   claude-chat config --reset
   ```

## Development

### Requirements

- Node.js >= 18.0.0
- Bun runtime (recommended for development)
- tmux (for session management)

### Build from Source

```bash
git clone https://github.com/neeboo/claude-chat.git
cd claude-chat
bun install
bun run build
```

### Local Development

```bash
bun run dev      # Start development server with watch mode
bun run lint     # Run ESLint
bun run format   # Run Prettier
bun run test     # Run tests
bun run type-check # TypeScript type checking
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

- **neeboo** - [GitHub](https://github.com/neeboo)

## Repository

- **GitHub**: [https://github.com/neeboo/claude-chat](https://github.com/neeboo/claude-chat)
- **Issues**: [https://github.com/neeboo/claude-chat/issues](https://github.com/neeboo/claude-chat/issues)

MIT
