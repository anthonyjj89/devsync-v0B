import fs from 'fs';
import path from 'path';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug.js';

const COMPONENT = 'FileHistoryManager';
const HISTORY_DIR = '.history';

class FileHistoryManager {
    constructor() {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'FileHistoryManager initialized');
    }

    getHistoryPath(projectPath) {
        return path.join(projectPath, HISTORY_DIR);
    }

    getFileHistoryPath(projectPath, filePath) {
        const historyPath = this.getHistoryPath(projectPath);
        const fileHistoryDir = path.join(historyPath, filePath);
        return fileHistoryDir;
    }

    async ensureHistoryDir(projectPath) {
        const historyPath = this.getHistoryPath(projectPath);
        try {
            await fs.promises.access(historyPath);
        } catch {
            await fs.promises.mkdir(historyPath, { recursive: true });
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Created history directory', {
                historyPath
            });
        }
    }

    async saveVersion(projectPath, filePath, content, timestamp = Date.now()) {
        await this.ensureHistoryDir(projectPath);
        const fileHistoryDir = this.getFileHistoryPath(projectPath, filePath);
        await fs.promises.mkdir(fileHistoryDir, { recursive: true });

        const versionFile = path.join(fileHistoryDir, `${timestamp}.txt`);
        await fs.promises.writeFile(versionFile, content);

        const metaFile = path.join(fileHistoryDir, `${timestamp}.meta.json`);
        const metadata = {
            timestamp,
            filePath,
            changes: 'File updated' // This could be enhanced with actual change detection
        };
        await fs.promises.writeFile(metaFile, JSON.stringify(metadata, null, 2));

        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Saved file version', {
            filePath,
            timestamp
        });
    }

    async getVersions(projectPath, filePath) {
        const fileHistoryDir = this.getFileHistoryPath(projectPath, filePath);
        
        try {
            await fs.promises.access(fileHistoryDir);
        } catch {
            return [];
        }

        const files = await fs.promises.readdir(fileHistoryDir);
        const versions = [];

        for (const file of files) {
            if (file.endsWith('.meta.json')) {
                const metaPath = path.join(fileHistoryDir, file);
                const metaContent = await fs.promises.readFile(metaPath, 'utf8');
                const metadata = JSON.parse(metaContent);
                versions.push(metadata);
            }
        }

        // Sort by timestamp descending (newest first)
        versions.sort((a, b) => b.timestamp - a.timestamp);

        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Retrieved file versions', {
            filePath,
            versionCount: versions.length
        });

        return versions;
    }

    async getVersion(projectPath, filePath, version) {
        if (version === 'latest') {
            try {
                const fullPath = path.join(projectPath, filePath);
                const content = await fs.promises.readFile(fullPath, 'utf8');
                return content;
            } catch (error) {
                debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error reading latest version', {
                    error: error.message
                });
                throw error;
            }
        }

        const fileHistoryDir = this.getFileHistoryPath(projectPath, filePath);
        const versionFile = path.join(fileHistoryDir, `${version}.txt`);

        try {
            const content = await fs.promises.readFile(versionFile, 'utf8');
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Retrieved file version', {
                filePath,
                version
            });
            return content;
        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error reading version', {
                error: error.message
            });
            throw error;
        }
    }

    async watchFile(projectPath, filePath) {
        const fullPath = path.join(projectPath, filePath);
        
        try {
            const watcher = fs.watch(fullPath, async (eventType) => {
                if (eventType === 'change') {
                    try {
                        const content = await fs.promises.readFile(fullPath, 'utf8');
                        await this.saveVersion(projectPath, filePath, content);
                        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'File change detected and saved', {
                            filePath
                        });
                    } catch (error) {
                        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error saving file version', {
                            error: error.message
                        });
                    }
                }
            });

            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Started watching file', {
                filePath
            });

            return watcher;
        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error setting up file watcher', {
                error: error.message
            });
            throw error;
        }
    }
}

export default FileHistoryManager;
