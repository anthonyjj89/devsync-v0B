import { io } from 'socket.io-client';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'FileWatcher';

class FileWatcher {
    constructor(onUpdate, onConnectionChange) {
        this.onUpdate = onUpdate;
        this.onConnectionChange = onConnectionChange;
        this.intervalId = null;
        this.lastTimestamp = null;
        this.basePath = null;
        this.taskFolder = null;
        this.projectPath = null;
        this.socket = null;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.isConnected = false;
        
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'FileWatcher instance created', {
            maxRetries: this.maxRetries
        });
    }

    setBasePath(path, taskFolder = '') {
        // Store paths separately
        this.basePath = path;
        this.taskFolder = taskFolder;
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Paths set', {
            basePath: this.basePath,
            taskFolder: this.taskFolder
        });
        return this;  // Return this to allow method chaining
    }

    setProjectPath(path) {
        this.projectPath = path;
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Project path set', {
            projectPath: this.projectPath
        });
        return this;
    }

    async getSubfolders() {
        if (!this.basePath) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'No base path set for getting subfolders');
            return { success: false, error: 'No base path set' };
        }

        const getFoldersId = `get-subfolders-${Date.now()}`;
        debugLogger.startTimer(getFoldersId);

        try {
            const encodedPath = encodeURIComponent(this.basePath);
            const response = await fetch(`http://localhost:3002/api/get-subfolders?path=${encodedPath}`, {
                credentials: 'include'
            });

            debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Subfolders response received', {
                status: response.status,
                ok: response.ok
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to get subfolders');
            }

            const duration = debugLogger.endTimer(getFoldersId, COMPONENT);
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Subfolders retrieved successfully', {
                folderCount: data.entries?.length,
                durationMs: duration
            });

            return data;
        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Failed to get subfolders', {
                error: error.message
            });
            return { success: false, error: error.message };
        }
    }

    async validatePath() {
        if (!this.basePath) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Base path not set');
            throw new Error('Base path must be set');
        }

        const validationId = `validate-path-${Date.now()}`;
        debugLogger.startTimer(validationId);
        
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Validating path...', {
            basePath: this.basePath,
            taskFolder: this.taskFolder
        });

        try {
            const encodedBasePath = encodeURIComponent(this.basePath);
            const encodedTaskFolder = encodeURIComponent(this.taskFolder || '');
            const response = await fetch(
                `http://localhost:3002/api/validate-path?basePath=${encodedBasePath}&taskFolder=${encodedTaskFolder}`,
                { credentials: 'include' }
            );

            debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Path validation response received', {
                status: response.status,
                ok: response.ok
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Path validation failed');
            }
            
            const duration = debugLogger.endTimer(validationId, COMPONENT);
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Path validated successfully', {
                basePath: this.basePath,
                taskFolder: this.taskFolder,
                durationMs: duration
            });

            return true;
        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Path validation failed', {
                basePath: this.basePath,
                taskFolder: this.taskFolder,
                error: error.message
            });
            throw error;
        }
    }

    async readFile(type) {
        if (!this.basePath || !this.taskFolder) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Base path or task folder not set for file read');
            return null;
        }

        const readId = `read-${type}-${Date.now()}`;
        debugLogger.startTimer(readId);

        const endpoint = type === 'claude' ? 'claude-messages' : 'api-messages';
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, `Reading ${type} messages`, {
            basePath: this.basePath,
            taskFolder: this.taskFolder,
            endpoint
        });

        try {
            const encodedBasePath = encodeURIComponent(this.basePath);
            const encodedTaskFolder = encodeURIComponent(this.taskFolder);
            const response = await fetch(
                `http://localhost:3002/api/${endpoint}?basePath=${encodedBasePath}&taskFolder=${encodedTaskFolder}`,
                { credentials: 'include' }
            );

            debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, `${type} messages response received`, {
                status: response.status,
                ok: response.ok
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            // Handle different message formats:
            // 1. Array of messages with type/say/text format
            // 2. Object with messages array
            // 3. Array of direct message objects
            let messages;
            if (Array.isArray(data)) {
                messages = data
                    .filter(msg => msg !== null && typeof msg === 'object')
                    .map(msg => {
                        // Handle text messages
                        if (msg.type === 'say' && msg.say === 'text') {
                            const isThinking = msg.text.startsWith('<thinking>');
                            return {
                                text: msg.text,
                                timestamp: msg.ts,
                                type: isThinking ? 'thinking' : 'text',
                                role: 'assistant',
                                metadata: msg.metadata || {}
                            };
                        }

                        // Handle API request messages
                        if (msg.type === 'say' && msg.say === 'api_req_started') {
                            return {
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
                        if (msg.type === 'ask' && msg.ask === 'tool') {
                            try {
                                const toolData = JSON.parse(msg.text);
                                return {
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
                                debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error parsing tool data', {
                                    error: error.message,
                                    messageText: msg.text
                                });
                                return null;
                            }
                        }

                        // Handle error messages
                        if (msg.isError) {
                            return {
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
                        return msg;
                    })
                    .filter(msg => msg !== null);
            } else if (data.messages) {
                messages = data.messages.filter(msg => msg !== null && typeof msg === 'object');
            } else {
                messages = [];
            }
            
            debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, `${type} messages processed`, {
                originalCount: data.length,
                processedCount: messages.length,
                format: Array.isArray(data) ? 'array' : 'object'
            });

            const duration = debugLogger.endTimer(readId, COMPONENT);
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, `${type} messages processed`, {
                messageCount: messages.length,
                durationMs: duration
            });

            return messages;
        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, `Failed to read ${type} messages`, {
                error: error.message
            });
            return [];
        }
    }

    async checkLastUpdated() {
        if (!this.basePath || !this.taskFolder) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Base path or task folder not set for timestamp check');
            return null;
        }

        const checkId = `check-timestamp-${Date.now()}`;
        debugLogger.startTimer(checkId);

        try {
            const encodedBasePath = encodeURIComponent(this.basePath);
            const encodedTaskFolder = encodeURIComponent(this.taskFolder);
            const response = await fetch(
                `http://localhost:3002/api/last-updated?basePath=${encodedBasePath}&taskFolder=${encodedTaskFolder}`,
                { credentials: 'include' }
            );

            debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Last updated response received', {
                status: response.status,
                ok: response.ok
            });

            // Return current timestamp if file doesn't exist
            if (!response.ok || response.status === 404) {
                const currentTimestamp = new Date().toISOString();
                debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Using current timestamp (no last_updated.txt)', {
                    timestamp: currentTimestamp
                });
                return currentTimestamp;
            }

            const data = await response.json();
            
            if (data.error) {
                const currentTimestamp = new Date().toISOString();
                debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Using current timestamp (error reading last_updated.txt)', {
                    timestamp: currentTimestamp,
                    error: data.error
                });
                return currentTimestamp;
            }
            
            const duration = debugLogger.endTimer(checkId, COMPONENT);
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Last updated timestamp retrieved', {
                timestamp: data.timestamp,
                durationMs: duration
            });

            return data.timestamp;
        } catch (error) {
            const currentTimestamp = new Date().toISOString();
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Using current timestamp (error)', {
                timestamp: currentTimestamp,
                error: error.message
            });
            return currentTimestamp;
        }
    }

    setupSocket() {
        if (this.socket) {
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Disconnecting existing socket');
            this.socket.disconnect();
        }

        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Setting up WebSocket connection');

        this.socket = io('http://localhost:3002', {
            withCredentials: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });
        
        this.socket.on('connect', () => {
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Connected to WebSocket server', {
                socketId: this.socket.id
            });
            this.retryCount = 0;
            this.isConnected = true;
            if (this.onConnectionChange) {
                this.onConnectionChange(true);
            }
            // Perform initial read when socket connects
            this.checkAndUpdate();
        });

        this.socket.on('connect_error', (error) => {
            this.retryCount++;
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Socket connection error', {
                error: error.message,
                retryCount: this.retryCount,
                maxRetries: this.maxRetries
            });
            
            if (this.retryCount >= this.maxRetries) {
                debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Max reconnection attempts reached');
                this.socket.disconnect();
            }
        });

        this.socket.on('fileUpdated', async (data) => {
            const updateId = `file-update-${Date.now()}`;
            debugLogger.startTimer(updateId);

            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'File update received', data);
            await this.checkAndUpdate();

            debugLogger.endTimer(updateId, COMPONENT);
        });

        this.socket.on('disconnect', () => {
            debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Disconnected from WebSocket server');
            this.isConnected = false;
            if (this.onConnectionChange) {
                this.onConnectionChange(false);
            }
        });
    }

    async start() {
        if (!this.basePath) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Base path not set');
            throw new Error('Base path must be set');
        }

        // Store the current paths before stopping
        const currentBasePath = this.basePath;
        const currentTaskFolder = this.taskFolder;
        const currentProjectPath = this.projectPath;

        // Stop any existing interval and socket
        this.stop();

        // Restore the paths
        this.basePath = currentBasePath;
        this.taskFolder = currentTaskFolder;
        this.projectPath = currentProjectPath;

        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Starting file monitoring', {
            basePath: this.basePath,
            taskFolder: this.taskFolder,
            projectPath: this.projectPath
        });

        // Set up Socket.IO connection
        this.setupSocket();

        // Do an initial check
        await this.checkAndUpdate();

        return this;
    }

    async checkAndUpdate() {
        if (!this.basePath || !this.taskFolder) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Base path or task folder not set for update check');
            return;
        }

        const updateId = `check-update-${Date.now()}`;
        debugLogger.startTimer(updateId);

        try {
            const [claudeMessages, apiMessages] = await Promise.all([
                this.readFile('claude'),
                this.readFile('api')
            ]);

            if (this.onUpdate) {
                if (claudeMessages) {
                    this.onUpdate('claude', claudeMessages);
                }
                if (apiMessages) {
                    this.onUpdate('api', apiMessages);
                }
            }

            const duration = debugLogger.endTimer(updateId, COMPONENT);
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Update check completed', {
                claudeMessagesCount: claudeMessages?.length,
                apiMessagesCount: apiMessages?.length,
                durationMs: duration
            });
        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error during file read', {
                error: error.message
            });
        }
    }

    stop() {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Stopping file monitoring');

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.lastTimestamp = null;
        this.retryCount = 0;
        this.isConnected = false;
        if (this.onConnectionChange) {
            this.onConnectionChange(false);
        }

        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'File monitoring stopped');
        return this;
    }
}

export default FileWatcher;
