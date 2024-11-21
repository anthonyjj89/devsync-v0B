import { debugLogger, DEBUG_LEVELS } from '../utils/debug';
import PathValidation from './path/PathValidation';
import FileOperations from './file/FileOperations';
import SocketManagement from './socket/SocketManagement';
import FileHistory from './file/FileHistory';

const COMPONENT = 'FileWatcher';

const AI_BASE_PATHS = {
    kodu: 'C:/Users/antho/AppData/Roaming/Code/User/globalStorage/kodu-ai.claude-dev-experimental/tasks',
    cline: 'C:/Users/antho/AppData/Roaming/Code/User/globalStorage/cline-ai.cline-dev/tasks'
};

class FileWatcher {
    constructor(onUpdate, aiType = 'kodu') {
        this.onUpdate = onUpdate;
        this.intervalId = null;
        this.lastTimestamp = null;
        this.basePath = AI_BASE_PATHS[aiType];
        this.taskFolder = null;
        this.projectPath = null;
        this.socket = null;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.aiType = aiType;

        // Initialize service modules
        this.pathValidation = new PathValidation();
        this.fileOperations = new FileOperations(this.pathValidation);
        this.fileHistory = new FileHistory(this.pathValidation);
        this.socketManagement = new SocketManagement(async (type) => {
            if (type === 'fileUpdate') {
                await this.checkAndUpdate();
            }
        });
        
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'FileWatcher instance created', {
            maxRetries: this.maxRetries,
            aiType: this.aiType,
            basePath: this.basePath
        });
    }

    setBasePath(path, taskFolder = '') {
        // Store paths separately and update path validation
        this.basePath = path;
        this.taskFolder = taskFolder;
        this.pathValidation.setBasePath(path, taskFolder);
        
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Paths set', {
            basePath: this.basePath,
            taskFolder: this.taskFolder,
            aiType: this.aiType
        });
        return this;  // Return this to allow method chaining
    }

    setProjectPath(path) {
        this.projectPath = path;
        this.pathValidation.setProjectPath(path);
        
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Project path set', {
            projectPath: this.projectPath,
            aiType: this.aiType
        });
        return this;
    }

    setAIType(aiType) {
        this.aiType = aiType;
        this.basePath = AI_BASE_PATHS[aiType];
        this.pathValidation.setBasePath(this.basePath, this.taskFolder);
        
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'AI type set', {
            aiType: this.aiType,
            basePath: this.basePath
        });
        return this;
    }

    async getSubfolders(currentPath = '') {
        // If no current path is provided, use the AI's base path
        const basePath = currentPath || this.basePath;
        if (!basePath) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'No base path available for getting subfolders');
            return { success: false, error: 'No base path available' };
        }

        try {
            const encodedPath = encodeURIComponent(basePath);
            const response = await fetch(
                `http://localhost:3002/api/get-subfolders?path=${encodedPath}`,
                { credentials: 'include' }
            );

            debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Subfolders response received', {
                status: response.status,
                ok: response.ok,
                aiType: this.aiType
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to get subfolders');
            }

            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Subfolders retrieved successfully', {
                folderCount: data.entries?.length,
                aiType: this.aiType
            });

            return data;
        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Failed to get subfolders', {
                error: error.message,
                aiType: this.aiType
            });
            return { success: false, error: error.message };
        }
    }

    async getFileHistory(filePath) {
        return this.fileHistory.getFileHistory(filePath);
    }

    async readProjectFile(filePath, version = 'latest') {
        return this.fileOperations.readProjectFile(filePath, version);
    }

    async validatePath() {
        return this.pathValidation.validatePath();
    }

    async validateProjectPath() {
        return this.pathValidation.validateProjectPath();
    }

    async readFile(type) {
        return this.fileOperations.readFile(type, this.aiType);
    }

    async checkLastUpdated() {
        return this.fileOperations.checkLastUpdated();
    }

    setupSocket() {
        this.socketManagement.setupSocket();
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
        const currentAIType = this.aiType;

        // Stop any existing interval and socket
        this.stop();

        // Restore the paths and AI type
        this.basePath = currentBasePath;
        this.taskFolder = currentTaskFolder;
        this.projectPath = currentProjectPath;
        this.aiType = currentAIType;
        this.pathValidation.setBasePath(currentBasePath, currentTaskFolder);
        if (currentProjectPath) {
            this.pathValidation.setProjectPath(currentProjectPath);
        }

        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Starting file monitoring', {
            basePath: this.basePath,
            taskFolder: this.taskFolder,
            projectPath: this.projectPath,
            aiType: this.aiType
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
                aiType: this.aiType,
                durationMs: duration
            });
        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error during file read', {
                error: error.message,
                aiType: this.aiType
            });
        }
    }

    stop() {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Stopping file monitoring', {
            aiType: this.aiType
        });

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.socketManagement.disconnect();
        this.fileHistory.clearCache();
        
        this.lastTimestamp = null;
        this.retryCount = 0;

        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'File monitoring stopped', {
            aiType: this.aiType
        });
        return this;
    }
}

export default FileWatcher;
