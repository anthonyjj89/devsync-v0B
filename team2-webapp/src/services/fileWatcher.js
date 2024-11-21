import { io } from 'socket.io-client';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'FileWatcher';

class FileWatcher {
    constructor(onUpdate, onConnectionChange) {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Initializing FileWatcher');
        this.onUpdate = onUpdate;
        this.onConnectionChange = onConnectionChange;
        this.socket = null;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.isConnected = false;
        this.messageCache = new Map();
        this.lastProcessedTimestamp = null;
        this.reconnectTimeout = null;
        this.isDestroyed = false;
    }

    setBasePath(path, taskFolder = '') {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Setting base path', {
            path,
            taskFolder
        });
        this.basePath = path;
        this.taskFolder = taskFolder;
        return this;
    }

    setProjectPath(path) {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Setting project path', { path });
        this.projectPath = path;
        return this;
    }

    async validatePath() {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Validating path', {
            basePath: this.basePath,
            taskFolder: this.taskFolder
        });

        if (!this.basePath) {
            throw new Error('Base path must be set');
        }

        const encodedBasePath = encodeURIComponent(this.basePath);
        const encodedTaskFolder = encodeURIComponent(this.taskFolder || '');
        
        try {
            const response = await fetch(
                `http://localhost:3002/api/validate-path?basePath=${encodedBasePath}&taskFolder=${encodedTaskFolder}`,
                { credentials: 'include' }
            );

            if (!response.ok) {
                const error = `HTTP error! status: ${response.status}`;
                debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Path validation failed', { error });
                throw new Error(error);
            }

            const data = await response.json();
            if (!data.success) {
                const error = data.error || 'Path validation failed';
                debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Path validation failed', { error });
                throw new Error(error);
            }

            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Path validation successful');
            return true;
        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Path validation error', { error: error.message });
            throw error;
        }
    }

    processMessage(msg) {
        if (!msg || typeof msg !== 'object') {
            debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Invalid message received', { msg });
            return null;
        }

        const cacheKey = JSON.stringify(msg);
        if (this.messageCache.has(cacheKey)) {
            debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Message found in cache');
            return this.messageCache.get(cacheKey);
        }

        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Processing message', {
            type: msg.type,
            say: msg.say,
            timestamp: msg.ts
        });

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
            } catch (error) {
                debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Failed to parse tool message', {
                    error: error.message,
                    text: msg.text
                });
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

        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Message processed', {
            type: processed.type,
            role: processed.role,
            timestamp: processed.timestamp
        });

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
        if (!this.basePath || !this.taskFolder) {
            debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Cannot read file - missing path config');
            return null;
        }

        const endpoint = type === 'claude' ? 'claude-messages' : 'api-messages';
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, `Reading ${type} messages`, {
            basePath: this.basePath,
            taskFolder: this.taskFolder
        });

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
            const processedMessages = messages
                .filter(msg => msg !== null && typeof msg === 'object')
                .map(msg => this.processMessage(msg))
                .filter(Boolean);

            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, `Processed ${type} messages`, {
                count: processedMessages.length
            });

            return processedMessages;

        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, `Failed to read ${type} messages`, {
                error: error.message
            });
            return [];
        }
    }

    setupSocket() {
        if (this.socket) {
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Cleaning up existing socket');
            this.socket.disconnect();
            this.socket = null;
        }

        if (this.isDestroyed) {
            debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Cannot setup socket - FileWatcher is destroyed');
            return;
        }

        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Setting up socket connection');

        this.socket = io('http://localhost:3002', {
            withCredentials: true,
            reconnection: true,
            reconnectionDelay: Math.min(1000 * Math.pow(2, this.retryCount), 10000),
            reconnectionDelayMax: 10000,
            reconnectionAttempts: this.maxRetries,
            timeout: 20000
        });
        
        this.socket.on('connect', () => {
            if (this.isDestroyed) {
                debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Socket connected but FileWatcher is destroyed');
                this.socket.disconnect();
                return;
            }

            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Socket connected', {
                basePath: this.basePath,
                taskFolder: this.taskFolder
            });

            // Subscribe to the path
            if (this.basePath && this.taskFolder) {
                const watchPath = `${this.basePath}/${this.taskFolder}`;
                this.socket.emit('subscribe', watchPath);
                debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Subscribed to path', {
                    path: watchPath
                });
            }

            this.retryCount = 0;
            this.isConnected = true;
            if (this.onConnectionChange) {
                debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Notifying connection state change', { connected: true });
                this.onConnectionChange(true);
            }
            this.checkAndUpdate();
        });

        this.socket.on('connect_error', (error) => {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Socket connection error', {
                error: error.message,
                retryCount: this.retryCount
            });

            this.retryCount++;
            if (this.retryCount >= this.maxRetries) {
                debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Max retries reached, disconnecting');
                this.socket.disconnect();
                if (this.onConnectionChange) {
                    this.onConnectionChange(false);
                }
            }
        });

        let updateTimeout = null;
        this.socket.on('fileUpdated', (data) => {
            if (this.isDestroyed) {
                debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'File update received but FileWatcher is destroyed');
                return;
            }

            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'File update received', data);

            // Debounce updates
            if (updateTimeout) {
                clearTimeout(updateTimeout);
            }
            updateTimeout = setTimeout(() => {
                if (!this.isDestroyed) {
                    this.checkAndUpdate();
                }
            }, 1000);
        });

        this.socket.on('disconnect', (reason) => {
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Socket disconnected', {
                reason
            });

            this.isConnected = false;
            if (this.onConnectionChange) {
                debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Notifying connection state change', { connected: false });
                this.onConnectionChange(false);
            }
        });
    }

    async start() {
        if (!this.basePath) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Cannot start - base path not set');
            throw new Error('Base path must be set');
        }

        if (this.isDestroyed) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Cannot start - FileWatcher is destroyed');
            throw new Error('FileWatcher has been destroyed');
        }

        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Starting file watcher', {
            basePath: this.basePath,
            taskFolder: this.taskFolder,
            projectPath: this.projectPath
        });

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
        if (!this.basePath || !this.taskFolder || this.isDestroyed) {
            debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Cannot check for updates', {
                hasBasePath: !!this.basePath,
                hasTaskFolder: !!this.taskFolder,
                isDestroyed: this.isDestroyed
            });
            return;
        }

        try {
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Checking for updates', {
                basePath: this.basePath,
                taskFolder: this.taskFolder
            });

            const [claudeMessages, apiMessages] = await Promise.all([
                this.readFile('claude'),
                this.readFile('api')
            ]);

            if (this.onUpdate && !this.isDestroyed) {
                if (claudeMessages?.length) {
                    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Sending claude messages update', {
                        count: claudeMessages.length
                    });
                    this.onUpdate('claude', claudeMessages);
                }
                if (apiMessages?.length) {
                    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Sending api messages update', {
                        count: apiMessages.length
                    });
                    this.onUpdate('api', apiMessages);
                }
            }
        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error during file read', {
                error: error.message,
                stack: error.stack
            });
        }
    }

    stop() {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Stopping file watcher');

        if (this.socket) {
            // Unsubscribe from the path before disconnecting
            if (this.basePath && this.taskFolder) {
                const watchPath = `${this.basePath}/${this.taskFolder}`;
                this.socket.emit('unsubscribe', watchPath);
                debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Unsubscribed from path', {
                    path: watchPath
                });
            }
            this.socket.disconnect();
            this.socket = null;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        this.lastProcessedTimestamp = null;
        this.retryCount = 0;
        this.isConnected = false;
        if (this.onConnectionChange) {
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Notifying connection state change on stop', { connected: false });
            this.onConnectionChange(false);
        }
        return this;
    }

    destroy() {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Destroying file watcher');
        this.isDestroyed = true;
        this.stop();
        this.messageCache.clear();
    }
}

export default FileWatcher;
