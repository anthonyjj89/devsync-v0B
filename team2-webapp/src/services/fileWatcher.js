import { io } from 'socket.io-client';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'FileWatcher';

class FileWatcher {
    constructor(onUpdate) {
        this.onUpdate = onUpdate;
        this.intervalId = null;
        this.lastTimestamp = null;
        this.basePath = null;
        this.socket = null;
        this.retryCount = 0;
        this.maxRetries = 5;
        
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'FileWatcher instance created', {
            maxRetries: this.maxRetries
        });
    }

    setBasePath(path) {
        // Normalize path to use forward slashes
        this.basePath = path.replace(/\\/g, '/');
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Base path set', {
            path: this.basePath
        });
        return this;  // Return this to allow method chaining
    }

    async validatePath() {
        const validationId = `validate-path-${Date.now()}`;
        debugLogger.startTimer(validationId);
        
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Validating path...', {
            path: this.basePath
        });

        try {
            // Properly encode the path for the URL
            const encodedPath = encodeURIComponent(this.basePath).replace(/%2F/g, '/');
            const response = await fetch(`http://localhost:3002/api/validate-path?path=${encodedPath}`, {
                credentials: 'include'
            });

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
                path: this.basePath,
                durationMs: duration
            });

            return true;
        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Path validation failed', {
                path: this.basePath,
                error: error.message
            });
            throw error;
        }
    }

    async readFile(type) {
        if (!this.basePath) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'No base path set for file read');
            return null;
        }

        const readId = `read-${type}-${Date.now()}`;
        debugLogger.startTimer(readId);

        const endpoint = type === 'claude' ? 'claude-messages' : 'api-messages';
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, `Reading ${type} messages`, {
            path: this.basePath,
            endpoint
        });

        try {
            const encodedPath = encodeURIComponent(this.basePath).replace(/%2F/g, '/');
            const response = await fetch(`http://localhost:3002/api/${endpoint}?path=${encodedPath}`, {
                credentials: 'include'
            });

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

            // Process messages based on type
            let messages = Array.isArray(data) ? data : [];
            debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, `Raw ${type} messages received`, {
                count: messages.length
            });
            
            // Filter out null/undefined messages but keep all valid objects
            messages = messages.filter(msg => msg !== null && typeof msg === 'object');
            
            const duration = debugLogger.endTimer(readId, COMPONENT);
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, `${type} messages processed`, {
                originalCount: data.length,
                filteredCount: messages.length,
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
        if (!this.basePath) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'No base path set for timestamp check');
            return null;
        }

        const checkId = `check-timestamp-${Date.now()}`;
        debugLogger.startTimer(checkId);

        try {
            const encodedPath = encodeURIComponent(this.basePath).replace(/%2F/g, '/');
            const response = await fetch(`http://localhost:3002/api/last-updated?path=${encodedPath}`, {
                credentials: 'include'
            });

            debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Last updated response received', {
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
            
            const duration = debugLogger.endTimer(checkId, COMPONENT);
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Last updated timestamp retrieved', {
                timestamp: data.timestamp,
                durationMs: duration
            });

            return data.timestamp;
        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Failed to check last_updated.txt', {
                error: error.message
            });
            return null;
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
        });
    }

    async start() {
        if (!this.basePath) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'No base path set');
            return this;
        }

        // Store the current path before stopping
        const currentPath = this.basePath;

        // Stop any existing interval and socket
        this.stop();

        // Restore the path
        this.basePath = currentPath;

        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Starting file monitoring', {
            path: this.basePath
        });

        // Set up Socket.IO connection
        this.setupSocket();

        return this;
    }

    async checkAndUpdate() {
        if (!this.basePath) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'No base path set for update check');
            return;
        }

        const updateId = `check-update-${Date.now()}`;
        debugLogger.startTimer(updateId);

        try {
            const [claudeMessages, apiMessages] = await Promise.all([
                this.readFile('claude'),
                this.readFile('api')
            ]);

            if (claudeMessages) {
                this.onUpdate('claude', claudeMessages);
            }
            if (apiMessages) {
                this.onUpdate('api', apiMessages);
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

        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'File monitoring stopped');
        return this;
    }
}

export default FileWatcher;
