import { $ } from 'bun';
import type { Server } from 'bun';

interface Instance {
    id: string;
    name: string;
    tmuxPane?: string;
    tmuxSession?: string;
    tmuxWindow?: string;
    windowType?: string;
    role: string;
    lastActive: Date;
}

interface Message {
    from: string;
    to: string;
    content: string;
    type?: string;
}

interface MessageHistory {
    from: string;
    to: string;
    content: string;
    timestamp: Date;
    delivered: boolean;
    method: string;
}

class ClaudeMessageRouter {
    private readonly port: number;
    private readonly instances = new Map<string, Instance>();
    private readonly messageHistory: MessageHistory[] = [];
    private server?: Server;

    constructor(port?: number) {
        // Support environment variable configuration
        this.port = port ||
            (process.env.CLAUDE_CHAT_PORT ? parseInt(process.env.CLAUDE_CHAT_PORT, 10) : 3333);
    }

    start(): void {
        console.log('🚀 Message Router started successfully');
        console.log(`📡 Running on http://localhost:${this.port}`);

        this.server = Bun.serve({
            port: this.port,
            fetch: this.handleRequest.bind(this),
        });

        this.printUsageInstructions();
    }

    private async handleRequest(req: Request): Promise<Response> {
        const url = new URL(req.url);

        switch (url.pathname) {
            case '/register':
                return req.method === 'POST' ? this.handleRegister(req) : this.notFound();
            case '/message':
                return req.method === 'POST' ? this.handleMessage(req) : this.notFound();
            case '/messages':
                return this.handleGetMessages(url);
            case '/status':
                return this.handleStatus();
            case '/health':
                return this.handleHealth();
            default:
                return this.handleDefault();
        }
    }

    private async handleRegister(req: Request): Promise<Response> {
        try {
            const body = await req.json() as {
                id: string;
                name: string;
                tmuxPane?: string;
                tmuxSession?: string;
                tmuxWindow?: string;
                windowType?: string;
                role: string;
            };

            const { id, name, tmuxPane, tmuxSession, tmuxWindow, windowType, role } = body;

            this.instances.set(id, {
                id,
                name,
                tmuxPane,
                tmuxSession,
                tmuxWindow,
                windowType,
                role,
                lastActive: new Date(),
            });

            const target = tmuxSession || tmuxWindow || tmuxPane || 'unknown';
            console.log(`✅ Registered instance: ${name} (${role}) - Target: ${target} - Type: ${windowType || 'tmux-pane'}`);

            return Response.json({
                success: true,
                message: `${name} registered successfully`,
            });
        } catch (error) {
            console.error('❌ Registration failed:', error);
            return Response.json({
                success: false,
                message: 'Registration failed',
            }, { status: 400 });
        }
    }

    private async handleMessage(req: Request): Promise<Response> {
        try {
            const body = await req.json() as Message;
            const { from, to, content, type } = body;

            console.log(`\n📨 Message routing request:`);
            console.log(`  From: ${from}`);
            console.log(`  To: ${to || 'main'}`);
            console.log(`  Content: ${content}`);

            const targetInstance = this.findTargetInstance(to);

            if (!targetInstance) {
                return Response.json({
                    success: false,
                    message: 'Target instance not found',
                }, { status: 404 });
            }

            const success = await this.deliverMessage(targetInstance, from, content, type);

            return Response.json({
                success,
                message: success ? 'Message delivered' : 'Message delivery failed',
            }, { status: success ? 200 : 500 });
        } catch (error) {
            console.error('❌ Message processing failed:', error);
            return Response.json({
                success: false,
                message: 'Message processing failed',
            }, { status: 500 });
        }
    }

    private findTargetInstance(to?: string): Instance | undefined {
        console.log(this.instances);
        Array.from(this.instances.values()).forEach(instance => {
            console.log(instance);
            const target = instance.tmuxSession || instance.tmuxWindow || instance.tmuxPane || 'unknown';
            console.log(`  Instance: ${instance.name} (${instance.role}) - Target: ${target}`);
        });

        if (to === 'main' || !to) {
            return Array.from(this.instances.values()).find(i => i.role === 'main');
        }
        return this.instances.get(to);
    }

    private async deliverMessage(
        targetInstance: Instance,
        from: string,
        content: string,
        type?: string
    ): Promise<boolean> {
        const timestamp = new Date().toLocaleTimeString('en-US');
        const formattedMessage = type === 'completion'
            ? `🤖 [${timestamp}] ${from} completed work: ${content}`
            : `💬 [${timestamp}] ${from}: ${content}`; try {
                switch (targetInstance.windowType) {
                    case 'vscode-terminal-simple':
                        return this.deliverToVSCodeTerminal(targetInstance, formattedMessage, from);
                    case 'vscode-terminal-hybrid':
                        return this.deliverToVSCodeHybrid(targetInstance, formattedMessage, from);
                    case 'tmux-session':
                        return this.deliverToTmuxSession(targetInstance, formattedMessage, from);
                    default:
                        return this.deliverToTmux(targetInstance, formattedMessage, from);
                }
            } catch (error) {
                console.error(`❌ Delivery failed: ${error}`);
                return false;
            }
    }

    private async deliverToVSCodeTerminal(
        targetInstance: Instance,
        formattedMessage: string,
        from: string
    ): Promise<boolean> {
        console.log(`📤 Sending to VS Code terminal: ${targetInstance.name}`);
        console.log(`💬 Message: ${formattedMessage}`); this.messageHistory.push({
            from,
            to: targetInstance.id,
            content: formattedMessage,
            timestamp: new Date(),
            delivered: true,
            method: 'vscode-terminal',
        });

        return true;
    }

    private async deliverToVSCodeHybrid(
        targetInstance: Instance,
        formattedMessage: string,
        from: string
    ): Promise<boolean> {
        const tmuxTarget = targetInstance.tmuxSession;

        if (!tmuxTarget) {
            throw new Error('Hybrid mode missing tmux session information');
        } await $`tmux send-keys -t ${tmuxTarget} ""`;
        await $`sleep 0.3`;
        await $`tmux send-keys -t ${tmuxTarget} Enter`;

        await $`tmux send-keys -t ${tmuxTarget} "echo '${formattedMessage}'"`;
        await $`sleep 0.3`;
        await $`tmux send-keys -t ${tmuxTarget} Enter`;

        await $`tmux send-keys -t ${tmuxTarget} "echo ''"`;
        await $`sleep 0.3`;
        await $`tmux send-keys -t ${tmuxTarget} Enter`;

        console.log(`📤 Sending to hybrid mode: ${targetInstance.name} (${tmuxTarget})`);

        this.messageHistory.push({
            from,
            to: targetInstance.id,
            content: formattedMessage,
            timestamp: new Date(),
            delivered: true,
            method: 'vscode-hybrid',
        });

        return true;
    }

    private async deliverToTmuxSession(
        targetInstance: Instance,
        formattedMessage: string,
        from: string
    ): Promise<boolean> {
        const tmuxTarget = targetInstance.tmuxSession;

        if (!tmuxTarget) {
            throw new Error('Tmux session mode missing session information');
        } await $`tmux send-keys -t ${tmuxTarget} "C-c"`;
        await $`sleep 0.5`;

        await $`tmux send-keys -t ${tmuxTarget} "echo '${formattedMessage}'"`;
        await $`sleep 0.3`;
        await $`tmux send-keys -t ${tmuxTarget} Enter`;

        await $`tmux send-keys -t ${tmuxTarget} "echo"`;
        await $`sleep 0.3`;
        await $`tmux send-keys -t ${tmuxTarget} Enter`;

        console.log(`📤 Sending to tmux session: ${targetInstance.name} (${tmuxTarget})`);

        this.messageHistory.push({
            from,
            to: targetInstance.id,
            content: formattedMessage,
            timestamp: new Date(),
            delivered: true,
            method: 'tmux-session',
        });

        return true;
    }

    private async deliverToTmux(
        targetInstance: Instance,
        formattedMessage: string,
        from: string
    ): Promise<boolean> {
        const tmuxTarget =
            targetInstance.tmuxSession ||
            targetInstance.tmuxWindow ||
            targetInstance.tmuxPane;

        if (!tmuxTarget) {
            throw new Error('No tmux target found');
        }

        await $`tmux display-message -t ${tmuxTarget} "${formattedMessage}"`;

        try {
            await $`tmux send-keys -t ${tmuxTarget} "# ${formattedMessage}"`;
            await $`sleep 0.1`;
            await $`tmux send-keys -t ${tmuxTarget} Enter`;
        } catch {
            // If send-keys fails, ignore it, display-message has already shown the message
        }

        console.log(`📤 Sending to ${targetInstance.name} (${tmuxTarget}): ${formattedMessage}`); this.messageHistory.push({
            from,
            to: targetInstance.id,
            content: formattedMessage,
            timestamp: new Date(),
            delivered: true,
            method: 'tmux',
        });

        return true;
    }

    private handleGetMessages(url: URL): Response {
        const instanceId = url.searchParams.get('instance');
        const since = url.searchParams.get('since');

        let filteredMessages = this.messageHistory;

        if (instanceId) {
            filteredMessages = this.messageHistory.filter(msg => msg.to === instanceId);
        }

        if (since) {
            const sinceTime = new Date(since).getTime();
            filteredMessages = filteredMessages.filter(msg =>
                new Date(msg.timestamp).getTime() > sinceTime
            );
        }

        return Response.json({
            messages: filteredMessages.slice(-20),
            total: filteredMessages.length,
        });
    }

    private handleStatus(): Response {
        return Response.json({
            instances: Array.from(this.instances.values()),
            totalMessages: this.messageHistory.length,
            recentMessages: this.messageHistory.slice(-10),
        });
    }

    private handleHealth(): Response {
        return Response.json({
            status: 'healthy',
            instances: this.instances.size,
            uptime: process.uptime(),
        });
    }

    private handleDefault(): Response {
        return new Response('Claude Message Router', { status: 200 });
    }

    private notFound(): Response {
        return new Response('Not Found', { status: 404 });
    }

    private printUsageInstructions(): void {
        console.log(`\nUsage:`);
        console.log(`1. Start Claude instances in tmux`);
        console.log(`2. Register instances: curl -X POST http://localhost:${this.port}/register ...`);
        console.log(`3. Hook scripts call /message endpoint to send messages`);
    } stop(): void {
        if (this.server) {
            this.server.stop();
            console.log('🛑 Message Router stopped');
        }
    }
}

import { ConfigManager } from './config';

async function startRouter() {
    try {
        const configManager = ConfigManager.getInstance();
        await configManager.initialize();

        const effectivePort = configManager.getEffectivePort();
        const router = new ClaudeMessageRouter(effectivePort);
        router.start();

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\nShutting down server...');
            router.stop();
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            console.log('\nShutting down server...');
            router.stop();
            process.exit(0);
        });

        return router;
    } catch (error) {
        console.error('❌ Failed to start router:', error);
        process.exit(1);
    }
}

// Start the application if this file is run directly
if (import.meta.main) {
    startRouter();
}

export default ClaudeMessageRouter;