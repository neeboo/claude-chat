#!/usr/bin/env bun

import { Command } from 'commander';
import { $ } from 'bun';
import { existsSync } from 'fs';
import path from 'path';
import { ConfigManager } from './config';

interface InstanceConfig {
    id: string;
    name: string;
    role: string;
    workDir: string;
    tmuxSession: string;
}

class ClaudeChatCLI {
    private program: Command;
    private configManager: ConfigManager | null = null;

    constructor() {
        this.program = new Command();
        this.setupCommands();
    }

    private async getConfigManager(): Promise<ConfigManager> {
        const manager = ConfigManager.getInstance();
        await manager.initialize();
        return manager;
    }

    private setupCommands(): void {
        this.program
            .name('claude-chat')
            .description('Claude Chat CLI - Manage Claude instances and message routing')
            .version('1.0.0');

        // Register command
        this.program
            .command('register')
            .description('Register a Claude instance')
            .argument('<path>', 'Path to the working directory')
            .argument('<role>', 'Role of the instance (main, ui, api, etc.)')
            .option('-n, --name <name>', 'Custom name for the instance')
            .option('-s, --session <session>', 'Custom tmux session name')
            .option('-t, --type <type>', 'Window type', 'tmux-session')
            .option('--router-url <url>', 'Router URL', 'http://localhost:3333')
            .action(async (workPath: string, role: string, options: any) => {
                await this.registerInstance(workPath, role, options);
            });

        // Start command  
        this.program
            .command('start')
            .description('Start a Claude instance with tmux')
            .argument('<path>', 'Path to the working directory')
            .argument('<role>', 'Role of the instance (main, ui, api, etc.)')
            .option('-n, --name <name>', 'Custom name for the instance')
            .option('-s, --session <session>', 'Custom tmux session name')
            .option('--proxy', 'Enable proxy_git before starting')
            .option('--no-attach', 'Do not attach to tmux session after creation')
            .action(async (workPath: string, role: string, options: any) => {
                await this.startInstance(workPath, role, options);
            });

        // Status command
        this.program
            .command('status')
            .description('Show router and instances status')
            .option('--router-url <url>', 'Router URL', 'http://localhost:3333')
            .action(async (options: any) => {
                await this.showStatus(options);
            });

        // List command
        this.program
            .command('list')
            .description('List all registered instances')
            .option('--router-url <url>', 'Router URL', 'http://localhost:3333')
            .action(async (options: any) => {
                await this.listInstances(options);
            });

        // Router command
        this.program
            .command('router')
            .description('Router management commands')
            .option('--start', 'Start the message router')
            .option('--stop', 'Stop the message router')
            .option('--restart', 'Restart the message router')
            .action(async (options: any) => {
                await this.manageRouter(options);
            });

        // Init command
        this.program
            .command('init')
            .description('Initialize Claude chat protocol for a project directory')
            .argument('<path>', 'Path to the project directory')
            .option('--force', 'Force overwrite existing files')
            .option('--hooks-only', 'Only setup hooks, skip documentation')
            .option('--docs-only', 'Only setup documentation, skip hooks')
            .action(async (projectPath: string, options: any) => {
                await this.initProject(projectPath, options);
            });

        // Config command
        this.program
            .command('config')
            .description('Manage Claude Chat configuration')
            .option('--show', 'Show current configuration')
            .option('--set-port <port>', 'Set router port')
            .option('--set-host <host>', 'Set router host')
            .option('--reset', 'Reset to default configuration')
            .action(async (options: any) => {
                await this.manageConfig(options);
            });
    }

    private async registerInstance(
        workPath: string,
        role: string,
        options: any
    ): Promise<void> {
        try {
            // Validate path
            const fullPath = path.resolve(workPath);
            if (!existsSync(fullPath)) {
                console.error(`❌ Error: Path '${fullPath}' does not exist`);
                process.exit(1);
            }

            // Generate instance config
            const config = this.generateInstanceConfig(fullPath, role, options);

            console.log(`📝 Registering instance:`);
            console.log(`  ID: ${config.id}`);
            console.log(`  Name: ${config.name}`);
            console.log(`  Role: ${config.role}`);
            console.log(`  Work Dir: ${config.workDir}`);
            console.log(`  Tmux Session: ${config.tmuxSession}`);

            // Check if router is running
            const configManager = await this.getConfigManager();
            const routerUrl = options.routerUrl || configManager.getEffectiveRouterUrl();
            if (!(await this.isRouterRunning(routerUrl))) {
                console.error(`❌ Error: Message router is not running at ${routerUrl}`);
                console.log(`💡 Tip: Start the router with 'claude-chat router --start'`);
                process.exit(1);
            }

            // Register with router
            const response = await fetch(`${routerUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: config.id,
                    name: config.name,
                    tmuxSession: config.tmuxSession,
                    windowType: options.type || 'tmux-session',
                    role: config.role,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                console.error(`❌ Registration failed: ${error}`);
                process.exit(1);
            }

            const result = await response.json();
            console.log(`✅ ${result.message}`);

        } catch (error) {
            console.error(`❌ Registration error: ${error}`);
            process.exit(1);
        }
    }

    private async startInstance(
        workPath: string,
        role: string,
        options: any
    ): Promise<void> {
        try {
            // Validate path
            const fullPath = path.resolve(workPath);
            if (!existsSync(fullPath)) {
                console.error(`❌ Error: Path '${fullPath}' does not exist`);
                process.exit(1);
            }

            // Generate instance config
            const config = this.generateInstanceConfig(fullPath, role, options);

            console.log(`🚀 Starting Claude instance:`);
            console.log(`  Name: ${config.name}`);
            console.log(`  Work Dir: ${config.workDir}`);
            console.log(`  Tmux Session: ${config.tmuxSession}`);

            // Enable proxy if requested
            if (options.proxy) {
                console.log(`🔧 Enabling proxy...`);
                try {
                    await $`source ~/.zshrc && proxy_git`.quiet();
                    console.log(`✅ Proxy enabled`);
                } catch {
                    console.log(`⚠️  Proxy not found, continuing...`);
                }
            }

            // Start message router if not running
            const configManager = await this.getConfigManager();
            if (!(await this.isRouterRunning(configManager.getEffectiveRouterUrl()))) {
                console.log(`🔧 Starting message router...`);
                await this.startRouter();
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Clean up existing tmux session
            console.log(`🔧 Setting up tmux session...`);
            try {
                await $`tmux kill-session -t ${config.tmuxSession}`.quiet();
            } catch {
                // Session doesn't exist, which is fine
            }

            // Create new tmux session
            await $`tmux new-session -d -s ${config.tmuxSession} -c "${config.workDir}"`;

            // Setup environment in tmux
            await $`tmux send-keys -t ${config.tmuxSession} "cd ${config.workDir}" Enter`;
            await $`tmux send-keys -t ${config.tmuxSession} "export CLAUDE_INSTANCE_ID=${config.id}" Enter`;
            await $`tmux send-keys -t ${config.tmuxSession} "export CLAUDE_INSTANCE_NAME='${config.name}'" Enter`;
            await $`tmux send-keys -t ${config.tmuxSession} "export CLAUDE_INSTANCE_ROLE=${config.role}" Enter`;
            await $`tmux send-keys -t ${config.tmuxSession} "export CLAUDE_AUTO_CONFIRM=yes" Enter`;
            await $`tmux send-keys -t ${config.tmuxSession} "clear" Enter`;

            // Display startup info
            await $`tmux send-keys -t ${config.tmuxSession} "echo '🎯 ${config.name} Claude Instance'" Enter`;
            await $`tmux send-keys -t ${config.tmuxSession} "echo '📁 Work Dir: $(pwd)'" Enter`;
            await $`tmux send-keys -t ${config.tmuxSession} "echo '🔗 Tmux Session: ${config.tmuxSession}'" Enter`;
            await $`tmux send-keys -t ${config.tmuxSession} "echo '💬 Message Reception: Enabled (send-keys)'" Enter`;
            await $`tmux send-keys -t ${config.tmuxSession} "echo ''" Enter`;

            console.log(`✅ Tmux session '${config.tmuxSession}' ready`);

            // Auto-register instance
            console.log(`📝 Auto-registering instance...`);
            try {
                const response = await fetch(`${configManager.getEffectiveRouterUrl()}/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id: config.id,
                        name: config.name,
                        tmuxSession: config.tmuxSession,
                        windowType: 'tmux-session',
                        role: config.role,
                    }),
                });

                if (response.ok) {
                    console.log(`✅ Instance registered with router`);
                } else {
                    console.log(`⚠️  Router registration failed, continuing...`);
                }
            } catch {
                console.log(`⚠️  Router registration failed, continuing...`);
            }

            // Start Claude in tmux
            console.log(`🤖 Starting Claude in tmux session...`);
            await $`tmux send-keys -t ${config.tmuxSession} "claude --dangerously-skip-permissions" Enter`;

            // Attach to session unless --no-attach is specified
            if (!options.noAttach) {
                console.log(`🔗 Connecting to tmux session (Ctrl+B then D to detach)`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                await $`tmux attach -t ${config.tmuxSession}`;
            } else {
                console.log(`✅ Claude instance started in background`);
                console.log(`💡 To attach: tmux attach -t ${config.tmuxSession}`);
            }

        } catch (error) {
            console.error(`❌ Failed to start instance: ${error}`);
            process.exit(1);
        }
    }

    private async showStatus(options: any): Promise<void> {
        const configManager = await this.getConfigManager();
        const routerUrl = options.routerUrl || configManager.getEffectiveRouterUrl();

        console.log(`📊 Claude Chat Status\n`);

        // Check router status
        try {
            const healthResponse = await fetch(`${routerUrl}/health`);
            if (healthResponse.ok) {
                const health = await healthResponse.json();
                console.log(`🟢 Router: Running (${routerUrl})`);
                console.log(`   Uptime: ${Math.floor(health.uptime)}s`);
                console.log(`   Instances: ${health.instances}`);
            }
        } catch {
            console.log(`🔴 Router: Not running (${routerUrl})`);
            return;
        }

        // Get detailed status
        try {
            const statusResponse = await fetch(`${routerUrl}/status`);
            if (statusResponse.ok) {
                const status = await statusResponse.json();

                console.log(`\n📋 Instances (${status.instances.length}):`);
                if (status.instances.length === 0) {
                    console.log(`   No instances registered`);
                } else {
                    status.instances.forEach((instance: any) => {
                        console.log(`   • ${instance.name} (${instance.id})`);
                        console.log(`     Role: ${instance.role}`);
                        console.log(`     Session: ${instance.tmuxSession || 'N/A'}`);
                        console.log(`     Type: ${instance.windowType || 'N/A'}`);
                        console.log(`     Last Active: ${new Date(instance.lastActive).toLocaleString()}`);
                    });
                }

                console.log(`\n💬 Message History:`);
                console.log(`   Total Messages: ${status.totalMessages}`);
                if (status.recentMessages.length > 0) {
                    console.log(`   Recent Messages (${status.recentMessages.length}):`);
                    status.recentMessages.slice(-3).forEach((msg: any) => {
                        console.log(`     ${new Date(msg.timestamp).toLocaleTimeString()}: ${msg.from} → ${msg.to}`);
                    });
                }
            }
        } catch (error) {
            console.error(`❌ Failed to get detailed status: ${error}`);
        }
    }

    private async listInstances(options: any): Promise<void> {
        const configManager = await this.getConfigManager();
        const routerUrl = options.routerUrl || configManager.getEffectiveRouterUrl();

        try {
            const response = await fetch(`${routerUrl}/status`);
            if (!response.ok) {
                console.error(`❌ Failed to connect to router at ${routerUrl}`);
                return;
            }

            const status = await response.json();

            console.log(`📋 Registered Instances (${status.instances.length}):\n`);

            if (status.instances.length === 0) {
                console.log(`No instances registered`);
                console.log(`💡 Use 'claude-chat register <path> <role>' to register an instance`);
                return;
            }

            status.instances.forEach((instance: any, index: number) => {
                console.log(`${index + 1}. ${instance.name}`);
                console.log(`   ID: ${instance.id}`);
                console.log(`   Role: ${instance.role}`);
                console.log(`   Tmux Session: ${instance.tmuxSession || 'N/A'}`);
                console.log(`   Window Type: ${instance.windowType || 'N/A'}`);
                console.log(`   Last Active: ${new Date(instance.lastActive).toLocaleString()}`);
                console.log(``);
            });

        } catch (error) {
            console.error(`❌ Error: ${error}`);
        }
    }

    private async manageRouter(options: any): Promise<void> {
        if (options.start) {
            await this.startRouter();
        } else if (options.stop) {
            await this.stopRouter();
        } else if (options.restart) {
            await this.stopRouter();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.startRouter();
        } else {
            console.log(`❌ Please specify --start, --stop, or --restart`);
        }
    }

    private async startRouter(): Promise<void> {
        try {
            const configManager = await this.getConfigManager();
            if (await this.isRouterRunning(configManager.getEffectiveRouterUrl())) {
                console.log(`✅ Router is already running`);
                return;
            }

            console.log(`🚀 Starting message router...`);

            // Find the current directory (where claude-chat is)
            const currentDir = process.cwd();

            // Start router in background
            const proc = Bun.spawn(['bun', 'run', 'src/index.ts'], {
                cwd: currentDir,
                stdout: 'ignore',
                stderr: 'ignore',
                stdin: 'ignore',
            });

            // Wait a moment for startup
            await new Promise(resolve => setTimeout(resolve, 2000));

            if (await this.isRouterRunning(configManager.getEffectiveRouterUrl())) {
                console.log(`✅ Message router started successfully`);
            } else {
                console.error(`❌ Failed to start message router`);
            }

        } catch (error) {
            console.error(`❌ Error starting router: ${error}`);
        }
    }

    private async stopRouter(): Promise<void> {
        try {
            console.log(`🛑 Stopping message router...`);

            // Try to find and kill the router process
            await $`pkill -f "bun.*src/index.ts"`.quiet().catch(() => {
                // Process might not be running
            });

            await new Promise(resolve => setTimeout(resolve, 1000));

            const configManager = await this.getConfigManager();
            if (!(await this.isRouterRunning(configManager.getEffectiveRouterUrl()))) {
                console.log(`✅ Message router stopped`);
            } else {
                console.log(`⚠️  Router might still be running`);
            }

        } catch (error) {
            console.error(`❌ Error stopping router: ${error}`);
        }
    }

    private async isRouterRunning(url: string): Promise<boolean> {
        try {
            const response = await fetch(`${url}/health`, {
                signal: AbortSignal.timeout(2000)
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    private generateInstanceConfig(
        workPath: string,
        role: string,
        options: any
    ): InstanceConfig {
        const fullPath = path.resolve(workPath);
        const dirName = path.basename(fullPath);

        return {
            id: role,
            name: options.name || `${role.charAt(0).toUpperCase() + role.slice(1)} Instance`,
            role: role,
            workDir: fullPath,
            tmuxSession: options.session || `${role}-vscode`,
        };
    }

    private async initProject(projectPath: string, options: any): Promise<void> {
        try {
            const fullPath = path.resolve(projectPath);

            if (!existsSync(fullPath)) {
                console.error(`❌ Error: Project directory '${fullPath}' does not exist`);
                process.exit(1);
            }

            console.log(`🚀 Initializing Claude Chat protocol for: ${fullPath}`);

            // Setup hooks unless --docs-only
            if (!options.docsOnly) {
                await this.setupHooks(fullPath, options.force);
            }

            // Setup documentation unless --hooks-only
            if (!options.hooksOnly) {
                await this.setupDocumentation(fullPath, options.force);
            }

            console.log(`✅ Claude Chat protocol initialization complete!`);
            console.log(`\n💡 Next steps:`);
            console.log(`1. Start the message router: claude-chat router --start`);
            console.log(`2. Register this project: claude-chat register "${fullPath}" <role>`);
            console.log(`3. Start working with Claude in this directory`);

        } catch (error) {
            console.error(`❌ Initialization failed: ${error}`);
            process.exit(1);
        }
    }

    private async setupHooks(projectPath: string, force: boolean): Promise<void> {
        console.log(`🔧 Setting up hooks...`);

        // Create .claude/hooks directory
        const claudeDir = path.join(projectPath, '.claude');
        const hooksDir = path.join(claudeDir, 'hooks');

        await $`mkdir -p "${hooksDir}"`;

        // Copy simple-notifier.sh to hooks directory
        const notifierDest = path.join(hooksDir, 'simple-notifier.sh');

        // Always create from template to use current configuration
        await this.createNotifierScript(notifierDest);

        await $`chmod +x "${notifierDest}"`;
        console.log(`✅ Created: ${notifierDest}`);

        // Handle settings.local.json
        const settingsPath = path.join(projectPath, 'settings.local.json');
        await this.updateSettings(settingsPath, force);
    }

    private async updateSettings(settingsPath: string, force: boolean): Promise<void> {
        let settings: any = {};

        // Read existing settings if they exist
        if (existsSync(settingsPath)) {
            try {
                const content = await Bun.file(settingsPath).text();
                settings = JSON.parse(content);
                console.log(`📖 Found existing settings.local.json`);
            } catch (error) {
                console.log(`⚠️  Could not parse existing settings.local.json, creating new one`);
                settings = {};
            }
        }

        // Ensure hooks structure exists
        if (!settings.hooks) {
            settings.hooks = {};
        }
        if (!settings.hooks.EventName) {
            settings.hooks.EventName = [];
        }

        // Find existing Stop matcher
        let stopMatcher = settings.hooks.EventName.find((item: any) => item.matcher === 'Stop');

        if (!stopMatcher) {
            // Create new Stop matcher
            stopMatcher = {
                matcher: 'Stop',
                hooks: []
            };
            settings.hooks.EventName.push(stopMatcher);
        }

        // Check if our hook already exists
        const ourHook = {
            type: 'command',
            command: '.claude/hooks/simple-notifier.sh'
        };

        const existingHookIndex = stopMatcher.hooks.findIndex((hook: any) =>
            hook.type === 'command' && hook.command === '.claude/hooks/simple-notifier.sh'
        );

        if (existingHookIndex === -1) {
            // Add our hook to the end of the array
            stopMatcher.hooks.push(ourHook);
            console.log(`✅ Added message notifier hook to Stop events`);
        } else if (force) {
            // Replace existing hook
            stopMatcher.hooks[existingHookIndex] = ourHook;
            console.log(`✅ Updated existing message notifier hook`);
        } else {
            console.log(`ℹ️  Message notifier hook already exists (use --force to replace)`);
        }

        // Write updated settings
        await Bun.write(settingsPath, JSON.stringify(settings, null, 2));
        console.log(`✅ Updated: ${settingsPath}`);
    }

    private async setupDocumentation(projectPath: string, force: boolean): Promise<void> {
        console.log(`📝 Setting up documentation...`);

        const claudeDocPath = path.join(projectPath, 'CLAUDE.md');

        if (existsSync(claudeDocPath)) {
            // Append to existing CLAUDE.md
            await this.appendToClaudeDoc(claudeDocPath, force);
        } else {
            // Create new CLAUDE.md with our template
            await this.createClaudeDoc(claudeDocPath);
        }
    }

    private async appendToClaudeDoc(claudeDocPath: string, force: boolean): Promise<void> {
        const existingContent = await Bun.file(claudeDocPath).text();

        // Check if our protocol is already there
        if (existingContent.includes('Multi-Instance Collaboration Protocol') && !force) {
            console.log(`ℹ️  Protocol documentation already exists in CLAUDE.md (use --force to replace)`);
            return;
        }

        const protocolContent = await this.getProtocolTemplate();

        // Add separator and our content
        const separator = '\n\n---\n\n';
        const updatedContent = existingContent + separator + protocolContent;

        await Bun.write(claudeDocPath, updatedContent);
        console.log(`✅ Appended protocol to: ${claudeDocPath}`);
    }

    private async createClaudeDoc(claudeDocPath: string): Promise<void> {
        const protocolContent = await this.getProtocolTemplate();
        await Bun.write(claudeDocPath, protocolContent);
        console.log(`✅ Created: ${claudeDocPath}`);
    }

    private async getProtocolTemplate(): Promise<string> {
        const templatePath = path.join(__dirname, 'CLAUDE_TEMPLATE.md');

        if (existsSync(templatePath)) {
            return await Bun.file(templatePath).text();
        } else {
            // Fallback template if file doesn't exist
            return `## 🚨 CRITICAL: Multi-Instance Collaboration Protocol v2.0 (Effective Immediately)

**⚠️ Every Claude instance must read this protocol first upon startup ⚠️**

### 📋 Message Classification System (Strict Enforcement)

1. **[STATUS]** - Progress Reports (No Reply Required)
2. **[INFO]** - Information Sharing (No Reply Required)  
3. **[COORD] + [REPLY REQUIRED]** - Coordination Requests (Must Reply Within 48 Hours)
4. **[URGENT] + [REPLY REQUIRED]** - Critical Blocking Issues (Must Reply Within 2 Hours)

### Message Router & Communication

**Router Endpoints:**
- **Health Check**: \`GET http://localhost:3333/health\`
- **Instance Status**: \`GET http://localhost:3333/status\`  
- **Send Message**: \`POST http://localhost:3333/message\`
- **Register Instance**: \`POST http://localhost:3333/register\`

**Inter-Instance Communication:**
\`\`\`bash
curl -X POST http://localhost:3333/message \\
  -H "Content-Type: application/json" \\
  -d '{"from": "ui", "to": "main", "content": "Task completed"}'
\`\`\``;
        }
    }

    private async createNotifierScript(destPath: string): Promise<void> {
        const configManager = await this.getConfigManager();
        const defaultHost = configManager.getEffectiveHost();
        const defaultPort = configManager.getEffectivePort();

        const scriptContent = `#!/bin/bash

# 🤖 Claude tmux Message Notifier - Minimal Version
# Only focuses on the send_message functionality

# Core send_message function
send_message() {
    local to="$1"
    local content="$2"
    local type="\${3:-message}"
    
    # Support configurable router URL
    local router_host="\${CLAUDE_CHAT_HOST:-${defaultHost}}"
    local router_port="\${CLAUDE_CHAT_PORT:-${defaultPort}}"
    local router_url="\${CLAUDE_ROUTER_URL:-http://\${router_host}:\${router_port}/message}"
    local from="\${CLAUDE_INSTANCE_NAME:-$(basename $PWD)}"
    
    curl -s -X POST "$router_url" \\
        -H "Content-Type: application/json" \\
        -d "{
            \\"from\\": \\"$from\\",
            \\"to\\": \\"$to\\",
            \\"content\\": \\"$content\\",
            \\"type\\": \\"$type\\"
        }" 2>/dev/null && echo "✅ Message sent" || echo "❌ Send failed"
}

# Auto-send completion message if called as hook
if [[ "\${BASH_SOURCE[0]}" == "\${0}" ]]; then
    MESSAGE="\${CLAUDE_LAST_MESSAGE:-Task completed}"
    TARGET="\${CLAUDE_MESSAGE_TARGET:-main}"
    ROLE="\${CLAUDE_INSTANCE_ROLE:-}"
    
    # Only send if not main instance
    if [[ "$ROLE" != "main" ]]; then
        send_message "$TARGET" "$MESSAGE" "completion"
    fi
fi`;

        await Bun.write(destPath, scriptContent);
    }

    private async manageConfig(options: any): Promise<void> {
        const configManager = await this.getConfigManager();

        if (options.show) {
            console.log(`📋 Current Configuration:`);
            const config = configManager.getEffectiveConfig();
            console.log(`  Router URL: ${configManager.getEffectiveRouterUrl()}`);
            console.log(`  Host: ${config.router.host}`);
            console.log(`  Port: ${config.router.port}`);
            console.log(`  Default Role: ${config.defaults.instanceRole}`);
            console.log(`  Default Target: ${config.defaults.messageTarget}`);

            // Show environment overrides if any
            if (process.env.CLAUDE_CHAT_PORT) {
                console.log(`  📝 Port overridden by CLAUDE_CHAT_PORT: ${process.env.CLAUDE_CHAT_PORT}`);
            }
            if (process.env.CLAUDE_CHAT_HOST) {
                console.log(`  📝 Host overridden by CLAUDE_CHAT_HOST: ${process.env.CLAUDE_CHAT_HOST}`);
            }
            return;
        }

        if (options.setPort) {
            const port = parseInt(options.setPort, 10);
            if (isNaN(port) || port < 1 || port > 65535) {
                console.error(`❌ Invalid port: ${options.setPort}`);
                return;
            }
            configManager.setRouterPort(port);
            await configManager.saveConfig();
            console.log(`✅ Router port set to ${port}`);
        }

        if (options.setHost) {
            configManager.setRouterHost(options.setHost);
            await configManager.saveConfig();
            console.log(`✅ Router host set to ${options.setHost}`);
        }

        if (options.reset) {
            // Reset to defaults
            configManager.setRouterPort(3333);
            configManager.setRouterHost('localhost');
            await configManager.saveConfig();
            console.log(`✅ Configuration reset to defaults`);
        }

        if (!options.show && !options.setPort && !options.setHost && !options.reset) {
            console.log(`❌ Please specify an action: --show, --set-port, --set-host, or --reset`);
        }
    }

    run(): void {
        this.program.parse();
    }
}

// Run CLI
const cli = new ClaudeChatCLI();
cli.run();
