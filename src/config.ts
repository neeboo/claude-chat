export interface ClaudeChatConfig {
    router: {
        port: number;
        host: string;
    };
    defaults: {
        instanceRole: string;
        messageTarget: string;
    };
}

export class ConfigManager {
    private static instance: ConfigManager;
    private config: ClaudeChatConfig;
    private configPath: string;

    private constructor() {
        this.configPath = this.getConfigPath();
        this.config = this.getDefaultConfig(); // Start with defaults
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    public async initialize(): Promise<void> {
        this.config = await this.loadConfig();
    }

    private getConfigPath(): string {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
        return path.join(homeDir, '.claude-chat', 'config.json');
    }

    private getDefaultConfig(): ClaudeChatConfig {
        return {
            router: {
                port: 3333,
                host: 'localhost'
            },
            defaults: {
                instanceRole: 'main',
                messageTarget: 'main'
            }
        };
    }

    private async loadConfig(): Promise<ClaudeChatConfig> {
        try {
            if (existsSync(this.configPath)) {
                const content = await Bun.file(this.configPath).text();
                const parsed = JSON.parse(content);
                return { ...this.getDefaultConfig(), ...parsed };
            }
        } catch (error) {
            console.warn(`Warning: Could not load config from ${this.configPath}, using defaults`);
        }
        return this.getDefaultConfig();
    }

    public async saveConfig(): Promise<void> {
        try {
            const configDir = path.dirname(this.configPath);
            await $`mkdir -p "${configDir}"`;
            await Bun.write(this.configPath, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.error(`Error saving config: ${error}`);
        }
    }

    public getConfig(): ClaudeChatConfig {
        return this.config;
    }

    public getRouterUrl(): string {
        return `http://${this.config.router.host}:${this.config.router.port}`;
    }

    public getRouterMessageUrl(): string {
        return `${this.getRouterUrl()}/message`;
    }

    public setRouterPort(port: number): void {
        this.config.router.port = port;
    }

    public setRouterHost(host: string): void {
        this.config.router.host = host;
    }

    // Environment variable override support
    public getEffectiveConfig(): ClaudeChatConfig {
        const envPort = process.env.CLAUDE_CHAT_PORT;
        const envHost = process.env.CLAUDE_CHAT_HOST;

        const effectiveConfig = { ...this.config };

        if (envPort) {
            effectiveConfig.router.port = parseInt(envPort, 10);
        }

        if (envHost) {
            effectiveConfig.router.host = envHost;
        }

        return effectiveConfig;
    }

    public getEffectiveRouterUrl(): string {
        const config = this.getEffectiveConfig();
        return `http://${config.router.host}:${config.router.port}`;
    }

    public getEffectiveRouterMessageUrl(): string {
        return `${this.getEffectiveRouterUrl()}/message`;
    }

    // Helper methods for individual components
    public getEffectiveHost(): string {
        return this.getEffectiveConfig().router.host;
    }

    public getEffectivePort(): number {
        return this.getEffectiveConfig().router.port;
    }
}

// Re-export for convenience
import path from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';
