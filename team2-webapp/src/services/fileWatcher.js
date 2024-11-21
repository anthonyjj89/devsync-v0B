import { io } from 'socket.io-client';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'FileWatcher';

class FileWatcher {
    constructor(onUpdate, onConnectionChange) {
        this.onUpdate = onUpdate;
        this.onConnectionChange = onConnectionChange;
        this.socket = null;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.isConnected = false;
        this.messageCache = new Map(); // Cache for message processing
        this.lastProcessedTimestamp = null;
    }

    setBasePath(path, taskFolder = '') {
        this.basePath = path;
        this.taskFolder = taskFolder;
        return this;
    }

    setProjectPath(path) {
        this.projectPath = path;
        return this;
    }

    async validatePath() {
        if (!this.basePath) {
            throw new Error('Base path must be set');
        }

        const encodedBasePath = encodeURIComponent(this.basePath);
        const encodedTaskFolder = encodeURIComponent(this.taskFolder || '');
        const response = await fetch(
            `http://localhost:3002/api/validate-path?basePath=${encodedBasePath}&taskFolder=${encodedTaskFolder}`,
            { credentials: 'include' }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Path validation failed');
        }

        return true;
    }

    processMessage(msg) {
        if (!msg || typeof msg !== 'object') return null;

        const cacheKey = JSON.stringify(msg);
        if (this.messageCache.has(cacheKey)) {
            return this.messageCache.get(cacheKey);
        }

        let processed;

        // Handle text messages
        if (msg.type === 'say' && msg.say === 'text') {
            const isThinking = msg.text?.startsWith('<thinking>');
            processed = {
                text: msg.text,
                timestamp: msg.ts,
                type: isThinking ? 'thinking' : 'text',
                role: 'assistant',
                metadata: msg.metadata || {}
            };
        }
        // Handle API request messages
        else if (msg.type === 'say' && msg.say === 'api_req_started') {
            processed = {
                text: msg.text,
                timestamp: msg.ts,
                type: 'api_request',
                role: 'system',
                metadata: {
                    isApiRequest: true,
                    ...msg.metadata
                }
            };
        }
        // Handle tool messages
        else if (msg.type === 'ask' && msg.ask === 'tool') {
            try {
                const toolData = JSON.parse(msg.text);
                processed = {
                    timestamp: msg.ts,
                    type: 'tool_response',
                    text: toolData.result || toolData.question || msg.text,
                    tool: toolData.tool,
                    path: toolData.path,
                    status: toolData.approvalState || 'unknown',
                    error: toolData.error,
                    toolResult: toolData.result,
                    approvalState: toolData.approvalState,
                    toolStatus: toolData.status,
                    role: 'system',
                    metadata: {
                        isToolRequest: true,
                        ...msg.metadata
                    }
                };
            } catch {
                return null;
            }
        }
        // Handle error messages
        else if (msg.isError) {
            processed = {
                text: msg.text,
                timestamp: msg.ts,
                type: msg.type || 'text',
                role: 'system',
                isError: true,
                errorText: msg.errorText,
                metadata: msg.metadata || {}
            };
        }
        // Pass through other message types
        else {
            processed = msg;
        }

        // Cache the processed message
        this.messageCache.set(cacheKey, processed);

        // Keep cache size manageable
        if (this.messageCache.size > 1000) {
            const oldestKey = this.messageCache.keys().next().value;
            this.messageCache.delete(oldestKey);
        }

        return processed;
    }

    async readFile(type) {
        if (!this.basePath || !this.taskFolder) return null;

        const endpoint = type === 'claude' ? 'claude-messages' : 'api-messages';

        try {
            const encodedBasePath = encodeURIComponent(this.basePath);
            const encodedTaskFolder = encodeURIComponent(this.taskFolder);
            const response = await fetch(
                `http://localhost:3002/api/${endpoint}?basePath=${encodedBasePath}&taskFolder=${encodedTaskFolder}`,
                { credentials: 'include' }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            // Process messages
            const messages = Array.isArray(data) ? data : (data.messages || []);
            return messages
                .filter(msg => msg !== null && typeof msg === 'object')
                .map(msg => this.processMessage(msg))
                .filter(Boolean);

        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, `Failed to read ${type} messages`, {
                error: error.message
            });
            return [];
        }
    }

    setupSocket() {
        if (this.socket) {
            this.socket.disconnect();
        }

        this.socket = io('http://localhost:3002', {
            withCredentials: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });
        
        this.socket.on('connect', () => {
            this.retryCount = 0;
            this.isConnected = true;
            if (this.onConnectionChange) {
                this.onConnectionChange(true);
            }
            this.checkAndUpdate();
        });

        this.socket.on('connect_error', () => {
            this.retryCount++;
            if (this.retryCount >= this.maxRetries) {
                this.socket.disconnect();
            }
        });

        let updateTimeout = null;
        this.socket.on('fileUpdated', () => {
            // Debounce updates
            if (updateTimeout) {
                clearTimeout(updateTimeout);
            }
            updateTimeout = setTimeout(() => {
                this.checkAndUpdate();
            }, 1000);
        });

        this.socket.on('disconnect', () => {
            this.isConnected = false;
            if (this.onConnectionChange) {
                this.onConnectionChange(false);
            }
        });
    }

    async start() {
        if (!this.basePath) {
            throw new Error('Base path must be set');
        }

        const currentBasePath = this.basePath;
        const currentTaskFolder = this.taskFolder;
        const currentProjectPath = this.projectPath;

        this.stop();

        this.basePath = currentBasePath;
        this.taskFolder = currentTaskFolder;
        this.projectPath = currentProjectPath;

        this.setupSocket();
        await this.checkAndUpdate();

        return this;
    }

    async checkAndUpdate() {
        if (!this.basePath || !this.taskFolder) return;

        try {
            const [claudeMessages, apiMessages] = await Promise.all([
                this.readFile('claude'),
                this.readFile('api')
            ]);

            if (this.onUpdate) {
                if (claudeMessages?.length) {
                    this.onUpdate('claude', claudeMessages);
                }
                if (apiMessages?.length) {
                    this.onUpdate('api', apiMessages);
                }
            }
        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error during file read', {
                error: error.message
            });
        }
    }

    stop() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.lastProcessedTimestamp = null;
        this.retryCount = 0;
        this.isConnected = false;
        if (this.onConnectionChange) {
            this.onConnectionChange(false);
        }
        return this;
    }
}

export default FileWatcher;
