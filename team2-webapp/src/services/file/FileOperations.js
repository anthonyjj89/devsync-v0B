import { debugLogger, DEBUG_LEVELS } from '../../utils/debug';

const COMPONENT = 'FileOperations';

class FileOperations {
  constructor(pathValidation) {
    this.pathValidation = pathValidation;
  }

  async readProjectFile(filePath, version = 'latest') {
    const projectPath = this.pathValidation.getProjectPath();
    if (!projectPath) {
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Project path not set for file read');
      return null;
    }

    const readId = `read-project-file-${Date.now()}`;
    debugLogger.startTimer(readId);

    try {
      const encodedProjectPath = encodeURIComponent(projectPath);
      const encodedFilePath = encodeURIComponent(filePath);
      const encodedVersion = encodeURIComponent(version);
      const response = await fetch(
        `http://localhost:3002/api/read-project-file?projectPath=${encodedProjectPath}&filePath=${encodedFilePath}&version=${encodedVersion}`,
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
        version,
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
    const basePath = this.pathValidation.getBasePath();
    const taskFolder = this.pathValidation.getTaskFolder();

    if (!basePath || !taskFolder) {
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Base path or task folder not set for file read');
      return null;
    }

    const readId = `read-${type}-${Date.now()}`;
    debugLogger.startTimer(readId);

    const endpoint = type === 'claude' ? 'claude-messages' : 'api-messages';
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, `Reading ${type} messages`, {
      basePath,
      taskFolder,
      endpoint
    });

    try {
      const encodedBasePath = encodeURIComponent(basePath);
      const encodedTaskFolder = encodeURIComponent(taskFolder);
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
    const basePath = this.pathValidation.getBasePath();
    const taskFolder = this.pathValidation.getTaskFolder();

    if (!basePath || !taskFolder) {
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Base path or task folder not set for timestamp check');
      return null;
    }

    const checkId = `check-timestamp-${Date.now()}`;
    debugLogger.startTimer(checkId);

    try {
      const encodedBasePath = encodeURIComponent(basePath);
      const encodedTaskFolder = encodeURIComponent(taskFolder);
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
}

export default FileOperations;
