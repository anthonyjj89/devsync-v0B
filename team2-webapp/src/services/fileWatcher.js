import { io } from 'socket.io-client';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'FileWatcher';

class FileWatcher {
    constructor(onUpdate) {
        this.onUpdate = onUpdate;
        this.intervalId = null;
        this.lastTimestamp = null;
        this.basePath = null;
        this.taskFolder = null;
        this.projectPath = null;
        this.socket = null;
        this.retryCount = 0;
        this.maxRetries = 5;
        
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

    async getSubfolders(currentPath = '') {
        if (!this.projectPath) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'No project path set for getting subfolders');
            return { success: false, error: 'No project path set' };
        }

        const getFoldersId = `get-subfolders-${Date.now()}`;
        debugLogger.startTimer(getFoldersId);

        try {
            const fullPath = currentPath 
                ? `${this.projectPath}/${currentPath}` 
                : this.projectPath;
            const encodedPath = encodeURIComponent(fullPath);
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
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Entries retrieved successfully', {
                entryCount: data.entries?.length,
                durationMs: duration
            });

            return data;
        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Failed to get entries', {
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

    async validateProjectPath() {
        if (!this.projectPath) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Project path not set');
            throw new Error('Project path must be set');
        }

        const validationId = `validate-project-path-${Date.now()}`;
        debugLogger.startTimer(validationId);

        try {
            const encodedPath = encodeURIComponent(this.projectPath);
            const response = await fetch(
                `http://localhost:3002/api/validate-project-path?path=${encodedPath}`,
                { credentials: 'include' }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Project path validation failed');
            }

            const duration = debugLogger.endTimer(validationId, COMPONENT);
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Project path validated successfully', {
                projectPath: this.projectPath,
                durationMs: duration
            });

            return true;
        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Project path validation failed', {
                projectPath: this.projectPath,
                error: error.message
            });
            throw error;
        }
    }

    async readProjectFile(filePath) {
        if (!this.projectPath) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Project path not set for file read');
            return null;
        }

        const readId = `read-project-file-${Date.now()}`;
        debugLogger.startTimer(readId);

        try {
            const encodedProjectPath = encodeURIComponent(this.projectPath);
            const encodedFilePath = encodeURIComponent(filePath);
            const response = await fetch(
                `http://localhost:3002/api/read-project-file?projectPath=${encodedProjectPath}&filePath=${encodedFilePath}`,
                { credentials: 'include' }
            );

            debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Project file response received', {
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

            const duration = debugLogger.endTimer(readId, COMPONENT);
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Project file read successfully', {
                filePath,
                durationMs: duration
            });

            return data.content;
        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Failed to read project file', {
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
