import { $ } from 'bun';
import type { Server, ServerWebSocket } from 'bun';

interface Instance {
    id: string;
    name: string;
    tmuxPane?: string;
    tmuxSession?: string;
    tmuxWindow?: string;
    windowType?: string;
    role: string;
    lastActive: Date;
    type?: 'claude' | 'human'; // Add type to distinguish between Claude instances and humans
}

interface Message {
    from: string;
    to: string;
    content: string;
    type?: string;
    toAll?: boolean; // Add toAll flag to indicate if message is sent to all instances
}

interface MessageHistory {
    id: string; // Add unique ID for messages
    from: string;
    fromName: string; // Add sender display name
    to: string;
    toName: string; // Add recipient display name
    content: string;
    timestamp: Date;
    delivered: boolean;
    method: string;
    type?: 'message' | 'completion' | 'system'; // Add message type
    toAll: boolean;
}

class ClaudeMessageRouter {
    private readonly port: number;
    private readonly instances = new Map<string, Instance>();
    private readonly messageHistory: MessageHistory[] = [];
    private readonly webSocketClients = new Set<ServerWebSocket<unknown>>();
    private server?: Server;

    constructor(port?: number) {
        // Support environment variable configuration
        this.port =
            port ||
            (process.env.CLAUDE_CHAT_PORT
                ? parseInt(process.env.CLAUDE_CHAT_PORT, 10)
                : 3333);
    }

    start(): void {
        console.log('🚀 Message Router started successfully');
        console.log(`📡 Running on http://localhost:${this.port}`);
        console.log(`💬 Chat UI available at http://localhost:${this.port}/chat`);

        this.server = Bun.serve({
            port: this.port,
            fetch: this.handleRequest.bind(this),
            websocket: {
                message: this.handleWebSocketMessage.bind(this),
                open: this.handleWebSocketOpen.bind(this),
                close: this.handleWebSocketClose.bind(this),
            },
        });

        this.printUsageInstructions();
    }

    private async handleRequest(req: Request): Promise<Response> {
        const url = new URL(req.url);

        // Handle WebSocket upgrade
        if (req.headers.get('upgrade') === 'websocket') {
            const success = this.server!.upgrade(req);
            if (success) {
                return new Response('Upgraded to WebSocket', { status: 101 });
            }
            return new Response('WebSocket upgrade failed', { status: 400 });
        }

        switch (url.pathname) {
            case '/register':
                return req.method === 'POST'
                    ? this.handleRegister(req)
                    : this.notFound();
            case '/message':
                return req.method === 'POST'
                    ? this.handleMessage(req)
                    : this.notFound();
            case '/messages':
                return this.handleGetMessages(url);
            case '/status':
                return this.handleStatus();
            case '/health':
                return this.handleHealth();
            case '/chat':
                return this.handleChatPage();
            default:
                return this.handleDefault();
        }
    }

    private async handleRegister(req: Request): Promise<Response> {
        try {
            const body = (await req.json()) as {
                id: string;
                name: string;
                tmuxPane?: string;
                tmuxSession?: string;
                tmuxWindow?: string;
                windowType?: string;
                role: string;
            };

            const { id, name, tmuxPane, tmuxSession, tmuxWindow, windowType, role } =
                body;

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
            console.log(
                `✅ Registered instance: ${name} (${role}) - Target: ${target} - Type: ${windowType || 'tmux-pane'}`
            );

            return Response.json({
                success: true,
                message: `${name} registered successfully`,
            });
        } catch (error) {
            console.error('❌ Registration failed:', error);
            return Response.json(
                {
                    success: false,
                    message: 'Registration failed',
                },
                { status: 400 }
            );
        }
    }

    private async handleMessage(req: Request): Promise<Response> {
        try {
            const body = (await req.json()) as Message;
            const { from, to, content, type, toAll } = body;

            console.log(`\n📨 Message routing request:`);
            console.log(`  From: ${from}`);
            console.log(`  To: ${to || 'main'}`);
            console.log(`  Content: ${content}`);

            if (to === 'human') {
                const success = await this.deliverToHuman(to, from, content, (type ?? 'message') as 'message' | 'completion' | 'system', toAll);
                return Response.json(
                    {
                        success,
                        message: success ? 'Message delivered' : 'Message delivery failed',
                    },
                    { status: success ? 200 : 500 }
                );
            }

            const targetInstance = this.findTargetInstance(to);

            if (!targetInstance) {
                return Response.json(
                    {
                        success: false,
                        message: 'Target instance not found',
                    },
                    { status: 404 }
                );
            }

            const success = await this.deliverMessage(
                targetInstance,
                from,
                content,
                (type ?? 'message') as 'message' | 'completion' | 'system',
                toAll
            );

            return Response.json(
                {
                    success,
                    message: success ? 'Message delivered' : 'Message delivery failed',
                },
                { status: success ? 200 : 500 }
            );
        } catch (error) {
            console.error('❌ Message processing failed:', error);
            return Response.json(
                {
                    success: false,
                    message: 'Message processing failed',
                },
                { status: 500 }
            );
        }
    }

    private findTargetInstance(to?: string): Instance | undefined {
        console.log(this.instances);
        Array.from(this.instances.values()).forEach(instance => {
            console.log(instance);
            const target =
                instance.tmuxSession ||
                instance.tmuxWindow ||
                instance.tmuxPane ||
                'unknown';
            console.log(
                `  Instance: ${instance.name} (${instance.role}) - Target: ${target}`
            );
        });

        if (to === 'main' || !to) {
            return Array.from(this.instances.values()).find(i => i.role === 'main');
        }
        return this.instances.get(to);
    }

    private async deliverToHuman(
        to: string,
        from: string,
        content: string,
        type: 'message' | 'completion' | 'system' = 'message',
        toAll: boolean = false
    ): Promise<boolean> {
        const timestamp = new Date().toLocaleTimeString('en-US');
        const formattedMessage =
            type === 'completion'
                ? `🤖 [${timestamp}] ${from} completed work: ${content}`
                : `💬 [${timestamp}] ${from}: ${content}`;
        this.messageHistory.push(
            this.createMessageHistory(
                from,
                to,
                formattedMessage,
                'tmux',
                type,
                toAll
            )
        );

        // Broadcast to web clients
        this.broadcastToWebClients({
            type: 'new_message',
            message: this.messageHistory[this.messageHistory.length - 1],
        });

        return true;
    }

    private async deliverMessage(
        targetInstance: Instance,
        from: string,
        content: string,
        type: 'message' | 'completion' | 'system' = 'message',
        toAll: boolean = false
    ): Promise<boolean> {
        const timestamp = new Date().toLocaleTimeString('en-US');
        const formattedMessage =
            type === 'completion'
                ? `🤖 [${timestamp}] ${from} completed work: ${content}`
                : `💬 [${timestamp}] ${from}: ${content}`;
        try {
            switch (targetInstance.windowType) {
                case 'vscode-terminal-simple':
                    return this.deliverToVSCodeTerminal(
                        targetInstance,
                        formattedMessage,
                        from,
                        type,
                        toAll
                    );
                case 'vscode-terminal-hybrid':
                    return this.deliverToVSCodeHybrid(
                        targetInstance,
                        formattedMessage,
                        from,
                        type,
                        toAll
                    );
                case 'tmux-session':
                    return this.deliverToTmuxSession(
                        targetInstance,
                        formattedMessage,
                        from,
                        type,
                        toAll
                    );
                default:
                    return this.deliverToTmux(
                        targetInstance,
                        formattedMessage,
                        from,
                        type,
                        toAll
                    );
            }
        } catch (error) {
            console.error(`❌ Delivery failed: ${error}`);
            return false;
        }
    }

    private async deliverToVSCodeTerminal(
        targetInstance: Instance,
        formattedMessage: string,
        from: string,
        type: 'message' | 'completion' | 'system' = 'message',
        toAll: boolean = false
    ): Promise<boolean> {
        console.log(`📤 Sending to VS Code terminal: ${targetInstance.name}`);
        console.log(`💬 Message: ${formattedMessage}`);

        this.messageHistory.push(
            this.createMessageHistory(
                from,
                targetInstance.id,
                formattedMessage,
                'vscode-terminal',
                type,
                toAll
            )
        );

        // Broadcast to web clients
        this.broadcastToWebClients({
            type: 'new_message',
            message: this.messageHistory[this.messageHistory.length - 1],
        });

        return true;
    }

    private async deliverToVSCodeHybrid(
        targetInstance: Instance,
        formattedMessage: string,
        from: string,
        type: 'message' | 'completion' | 'system' = 'message',
        toAll: boolean = false
    ): Promise<boolean> {
        const tmuxTarget = targetInstance.tmuxSession;

        if (!tmuxTarget) {
            throw new Error('Hybrid mode missing tmux session information');
        }

        await $`tmux send-keys -t ${tmuxTarget} "'${formattedMessage}'"`;
        await $`sleep 0.3`;
        await $`tmux send-keys -t ${tmuxTarget} Enter`;

        console.log(
            `📤 Sending to hybrid mode: ${targetInstance.name} (${tmuxTarget})`
        );

        this.messageHistory.push(
            this.createMessageHistory(
                from,
                targetInstance.id,
                formattedMessage,
                'vscode-hybrid',
                type,
                toAll
            )
        );

        // Broadcast to web clients
        this.broadcastToWebClients({
            type: 'new_message',
            message: this.messageHistory[this.messageHistory.length - 1],
        });

        return true;
    }

    private async deliverToTmuxSession(
        targetInstance: Instance,
        formattedMessage: string,
        from: string,
        type: 'message' | 'completion' | 'system' = 'message',
        toAll: boolean = false
    ): Promise<boolean> {
        const tmuxTarget = targetInstance.tmuxSession;

        if (!tmuxTarget) {
            throw new Error('Tmux session mode missing session information');
        }
        await $`tmux send-keys -t ${tmuxTarget} ${formattedMessage}`;
        await $`sleep 0.3`;
        await $`tmux send-keys -t ${tmuxTarget} Enter`;

        console.log(
            `📤 Sending to tmux session: ${targetInstance.name} (${tmuxTarget})`
        );

        this.messageHistory.push(
            this.createMessageHistory(
                from,
                targetInstance.id,
                formattedMessage,
                'tmux-session',
                type,
                toAll
            )
        );

        // Broadcast to web clients
        this.broadcastToWebClients({
            type: 'new_message',
            message: this.messageHistory[this.messageHistory.length - 1],
        });

        return true;
    }

    private async deliverToTmux(
        targetInstance: Instance,
        formattedMessage: string,
        from: string,
        type: 'message' | 'completion' | 'system' = 'message',
        toAll: boolean = false
    ): Promise<boolean> {
        const tmuxTarget =
            targetInstance.tmuxSession ||
            targetInstance.tmuxWindow ||
            targetInstance.tmuxPane;

        if (!tmuxTarget) {
            throw new Error('No tmux target found');
        }

        await $`tmux display-message -t ${tmuxTarget} ${formattedMessage}`;

        try {
            await $`tmux send-keys -t ${tmuxTarget} ${formattedMessage}`;
            await $`sleep 0.1`;
            await $`tmux send-keys -t ${tmuxTarget} Enter`;
        } catch {
            // If send-keys fails, ignore it, display-message has already shown the message
        }

        console.log(
            `📤 Sending to ${targetInstance.name} (${tmuxTarget}): ${formattedMessage}`
        );

        this.messageHistory.push(
            this.createMessageHistory(
                from,
                targetInstance.id,
                formattedMessage,
                'tmux',
                type,
                toAll
            )
        );

        // Broadcast to web clients
        this.broadcastToWebClients({
            type: 'new_message',
            message: this.messageHistory[this.messageHistory.length - 1],
        });

        return true;
    }

    private handleGetMessages(url: URL): Response {
        const instanceId = url.searchParams.get('instance');
        const since = url.searchParams.get('since');

        let filteredMessages = this.messageHistory;

        if (instanceId) {
            filteredMessages = this.messageHistory.filter(
                msg => msg.to === instanceId
            );
        }

        if (since) {
            const sinceTime = new Date(since).getTime();
            filteredMessages = filteredMessages.filter(
                msg => new Date(msg.timestamp).getTime() > sinceTime
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
        console.log(
            `2. Register instances: curl -X POST http://localhost:${this.port}/register ...`
        );
        console.log(`3. Hook scripts call /message endpoint to send messages`);
        console.log(`4. Open chat UI: http://localhost:${this.port}/chat`);
    }

    // Helper method to create message history entry
    private createMessageHistory(
        from: string,
        to: string,
        content: string,
        method: string,
        type: 'message' | 'completion' | 'system' = 'message',
        toAll: boolean
    ): MessageHistory {
        const fromInstance = this.instances.get(from);
        const toInstance = this.instances.get(to);

        return {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            from,
            fromName: fromInstance?.name || from,
            to,
            toName: toInstance?.name || to,
            content,
            timestamp: new Date(),
            delivered: true,
            method,
            type,
            toAll,
        };
    }

    // WebSocket handlers
    private handleWebSocketOpen(ws: ServerWebSocket<unknown>): void {
        console.log('👋 New chat client connected');
        this.webSocketClients.add(ws);

        // Send current instances and recent messages
        ws.send(
            JSON.stringify({
                type: 'init',
                instances: Array.from(this.instances.values()),
                messages: this.messageHistory.slice(-20),
            })
        );
    }

    private handleWebSocketClose(ws: ServerWebSocket<unknown>): void {
        console.log('👋 Chat client disconnected');
        this.webSocketClients.delete(ws);
    }

    private handleWebSocketMessage(
        ws: ServerWebSocket<unknown>,
        message: string | Buffer
    ): void {
        try {
            const data = JSON.parse(message.toString());

            if (data.type === 'send_message') {
                this.handleChatMessage(data.from, data.to, data.content);
            }
        } catch (error) {
            console.error('❌ WebSocket message error:', error);
        }
    }

    // Handle chat messages from the web interface
    private async handleChatMessage(
        from: string,
        to: string,
        content: string,
        type: 'message' | 'completion' | 'system' = 'message',
        toAll: boolean = false
    ): Promise<void> {
        console.log(`\n💬 Chat message from ${from} to ${to}: ${content}`);

        // Create message history entry
        const messageEntry = this.createMessageHistory(
            from,
            to,
            content,
            'web-chat',
            type,
            toAll
        );
        this.messageHistory.push(messageEntry);

        // Broadcast to all web clients
        this.broadcastToWebClients({
            type: 'new_message',
            message: messageEntry,
        });

        // If message is not from 'human' to 'all', route it to Claude instances
        if (to !== 'all' && to !== 'human') {
            const targetInstance = this.findTargetInstance(to);
            if (targetInstance) {
                const formattedMessage = `💬 [${new Date().toLocaleTimeString()}] ${from}: ${content}`;
                await this.deliverMessage(targetInstance, from, content);
            }
        }

        if (to === 'all') {
            // Broadcast to all instances
            for (const instance of this.instances.values()) {
                await this.deliverMessage(instance, from, content, type, true);
            }
        }
        if (to === 'human') {
            // Deliver to human instances
            await this.deliverToHuman(to, from, content, type, toAll);
        }
    }

    // Broadcast message to all connected web clients
    private broadcastToWebClients(data: any): void {
        const message = JSON.stringify(data);
        for (const client of this.webSocketClients) {
            try {
                client.send(message);
            } catch (error) {
                // Remove disconnected clients
                this.webSocketClients.delete(client);
            }
        }
    }

    // Serve the chat page
    private handleChatPage(): Response {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Chat - Real-time Communication</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            height: 100vh; 
            display: flex; 
            flex-direction: column;
            background: #f5f5f5;
        }
        .header { 
            background: #2c3e50; 
            color: white; 
            padding: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .main { 
            flex: 1; 
            display: flex;
            overflow: hidden;
        }
        .sidebar { 
            width: 280px; 
            background: white; 
            border-right: 1px solid #ddd;
            padding: 1rem;
            overflow-y: auto;
        }
        .chat-area { 
            flex: 1; 
            display: flex; 
            flex-direction: column;
            background: white;
        }
        .messages { 
            flex: 1; 
            padding: 1rem; 
            overflow-y: auto;
            max-height: calc(100vh - 200px);
        }
        .input-area { 
            padding: 1rem; 
            border-top: 1px solid #ddd;
            background: #fafafa;
        }
        .message { 
            margin-bottom: 1rem; 
            padding: 0.75rem;
            border-radius: 8px;
            max-width: 80%;
            word-break: break-all;
            word-wrap: break-word;
        }
        .message.human { 
            background: #e3f2fd; 
            margin-left: auto; 
            text-align: right;
        }
        .message.short { 
            background: #e8f5e9; 
            max-width: 30%;
        }
        .message.claude { 
            background: #f1f8e9; 
        }
        .message.system { 
            background: #fff3e0; 
            font-style: italic;
            text-align: center;
            max-width: 100%;
        }
        .message-header { 
            font-size: 0.85em; 
            opacity: 0.7; 
            margin-bottom: 0.25rem;
        }
        .input-group { 
            display: flex; 
            gap: 0.5rem;
            align-items: center;
        }
        .input-group input, .input-group select { 
            padding: 0.75rem; 
            border: 1px solid #ddd; 
            border-radius: 4px;
            font-size: 1rem;
        }
        .input-group input[type="text"] { 
            flex: 1; 
        }
        .input-group select { 
            min-width: 120px; 
        }
        .input-group button { 
            padding: 0.75rem 1.5rem; 
            background: #2c3e50; 
            color: white; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer;
            font-size: 1rem;
        }
        .input-group button:hover { 
            background: #34495e; 
        }
        .instance { 
            padding: 0.5rem; 
            margin-bottom: 0.5rem; 
            background: #f8f9fa; 
            border-radius: 4px;
            border-left: 4px solid #2c3e50;
        }
        .instance.online { 
            border-left-color: #27ae60; 
        }
        .instance-name { 
            font-weight: bold; 
        }
        .instance-role { 
            font-size: 0.85em; 
            opacity: 0.7; 
        }
        .status { 
            padding: 0.5rem; 
            background: #e8f5e8; 
            border-radius: 4px; 
            margin-bottom: 1rem;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 Claude Chat - Real-time Communication</h1>
        <p>Communicate with Claude instances in real-time</p>
    </div>
    
    <div class="main">
        <div class="sidebar">
            <div class="status" id="status">Connecting...</div>
            <h3>Instances</h3>
            <div id="instances"></div>
        </div>
        
        <div class="chat-area">
            <div class="messages" id="messages"></div>
            <div class="input-area">
                <div class="input-group">
                    <input type="text" id="messageInput" placeholder="Type your message..." />
                    <select id="targetSelect">
                        <option value="all">@all</option>
                    </select>
                    <button onclick="sendMessage()">Send</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        let ws;
        let instances = new Map();
        
        function connect() {
            const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(\`\${protocol}//\${location.host}\`);
            
            ws.onopen = function() {
                document.getElementById('status').textContent = '🟢 Connected';
                document.getElementById('status').style.background = '#e8f5e8';
            };
            
            ws.onclose = function() {
                document.getElementById('status').textContent = '🔴 Disconnected - Reconnecting...';
                document.getElementById('status').style.background = '#fee';
                setTimeout(connect, 3000);
            };
            
            ws.onmessage = function(event) {
                const data = JSON.parse(event.data);
                handleMessage(data);
            };
        }
        
        function handleMessage(data) {
            switch(data.type) {
                case 'init':
                    updateInstances(data.instances);
                    data.messages.forEach(msg => addMessage(msg));
                    break;
                case 'new_message':
                    addMessage(data.message);
                    break;
                case 'instance_update':
                    updateInstances(data.instances);
                    break;
            }
        }
        
        function updateInstances(instanceList) {
            instances.clear();
            const container = document.getElementById('instances');
            const select = document.getElementById('targetSelect');
            
            container.innerHTML = '';
            select.innerHTML = '<option value="all">@all</option>';
            
            instanceList.forEach(instance => {
                instances.set(instance.id, instance);
                
                const div = document.createElement('div');
                div.className = 'instance online';
                div.innerHTML = \`
                    <div class="instance-name">\${instance.name}</div>
                    <div class="instance-role">\\@\${instance.role}</div>
                \`;
                container.appendChild(div);
                
                const option = document.createElement('option');
                option.value = instance.id;
                option.textContent = \`@\${instance.role}\`;
                select.appendChild(option);
            });
        }
        
        function addMessage(msg) {
            const container = document.getElementById('messages');
            const div = document.createElement('div');
            
            let messageClass = 'claude';
            if (msg.fromName === 'human' || msg.from === 'human') {
                messageClass = 'human';
            } else if (msg.type === 'system') {
                messageClass = 'system';
            }

            const time = new Date(msg.timestamp).toLocaleTimeString();
            const toRole = msg.to === 'all' ? 'all' : (instances.get(msg.to)?.role || msg.role || msg.to);
            const withToAll = msg.toAll && msg.to !== 'all' ? true : false;

            div.className = !withToAll ? \`message \${messageClass}\` : \`message \${messageClass} short\`;
          
            if (!withToAll) {
                div.innerHTML = \`
                    <div class="message-header">\${msg.fromName} → @\${toRole} • \${time}</div>
                    <div>\${msg.content}</div>
                \`;
            }else{
                div.innerHTML = \`
                    <div class="message-header">✅ @\${toRole} • \${time}</div>
                \`;
            }
            
            
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }
        
        function sendMessage() {
            const input = document.getElementById('messageInput');
            const select = document.getElementById('targetSelect');
            
            if (!input.value.trim()) return;
            
            const message = {
                type: 'send_message',
                from: 'human',
                to: select.value,
                content: input.value.trim()
            };
            
            ws.send(JSON.stringify(message));
            input.value = '';
        }
        
        document.getElementById('messageInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        // Connect when page loads
        connect();
    </script>
</body>
</html>`;

        return new Response(html, {
            headers: { 'Content-Type': 'text/html' },
        });
    }
    stop(): void {
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
