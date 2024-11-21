import { debugLogger, DEBUG_LEVELS } from '../utils/debug';
import PathValidation from './path/PathValidation';
import FileOperations from './file/FileOperations';
import SocketManagement from './socket/SocketManagement';
import FileHistory from './file/FileHistory';

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
            maxRetries: this.maxRetries
        });
    }

    setBasePath(path, taskFolder = '') {
        // Store paths separately and update path validation
        this.basePath = path;
        this.taskFolder = taskFolder;
        this.pathValidation.setBasePath(path, taskFolder);
        
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Paths set', {
            basePath: this.basePath,
            taskFolder: this.taskFolder
        });
        return this;  // Return this to allow method chaining
    }

    setProjectPath(path) {
        this.projectPath = path;
        this.pathValidation.setProjectPath(path);
        
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Project path set', {
            projectPath: this.projectPath
        });
        return this;
    }

    async getSubfolders(currentPath = '') {
        return this.fileHistory.getSubfolders(currentPath);
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
        return this.fileOperations.readFile(type);
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

        // Stop any existing interval and socket
        this.stop();

        // Restore the paths
        this.basePath = currentBasePath;
        this.taskFolder = currentTaskFolder;
        this.projectPath = currentProjectPath;
        this.pathValidation.setBasePath(currentBasePath, currentTaskFolder);
        if (currentProjectPath) {
            this.pathValidation.setProjectPath(currentProjectPath);
        }

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
        
        this.socketManagement.disconnect();
        this.fileHistory.clearCache();
        
        this.lastTimestamp = null;
        this.retryCount = 0;

        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'File monitoring stopped');
        return this;
    }
}

export default FileWatcher;
