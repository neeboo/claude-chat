# Claude Chat Message Router

A message routing service for Claude instances with CLI management tools, built on Bun.

## Features

- 🚀 **Fast Startup**: Built on Bun runtime for quick startup
- 📡 **Message Routing**: Support for multiple message delivery methods
- 🔄 **Instance Management**: Dynamic registration and management of Claude instances
- 📊 **Status Monitoring**: Health check and status query interfaces
- 💬 **Message History**: Record and query message history
- 🛠️ **CLI Tools**: Command-line interface for easy management

## Supported Environments

- VS Code terminal mode
- VS Code hybrid mode (with tmux integration)
- Pure tmux session mode
- Traditional tmux pane/window mode

## Installation

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

## License

MIT
