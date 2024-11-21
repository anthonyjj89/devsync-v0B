import { debugLogger, DEBUG_LEVELS } from '../../utils/debug';

const COMPONENT = 'FileHistory';

class FileHistory {
  constructor(pathValidation) {
    this.pathValidation = pathValidation;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'FileHistory instance created', {
      cacheTimeout: this.cacheTimeout
    });
  }

  getCacheKey(filePath) {
    const projectPath = this.pathValidation.getProjectPath();
    return `${projectPath}:${filePath}`;
  }

  clearCache() {
    this.cache.clear();
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Cache cleared');
  }

  getCachedHistory(filePath) {
    const key = this.getCacheKey(filePath);
    const cached = this.cache.get(key);

    if (cached) {
      const { timestamp, data } = cached;
      const age = Date.now() - timestamp;

      if (age < this.cacheTimeout) {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Cache hit', {
          filePath,
          age: `${age}ms`
        });
        return data;
      } else {
        this.cache.delete(key);
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Cache expired', {
          filePath,
          age: `${age}ms`
        });
      }
    }

    return null;
  }

  setCachedHistory(filePath, history) {
    const key = this.getCacheKey(filePath);
    this.cache.set(key, {
      timestamp: Date.now(),
      data: history
    });
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Cache updated', {
      filePath,
      historyLength: history.length
    });
  }

  async getFileHistory(filePath) {
    const projectPath = this.pathValidation.getProjectPath();
    if (!projectPath) {
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'No project path set for getting file history');
      return { success: false, error: 'No project path set' };
    }

    // Check cache first
    const cachedHistory = this.getCachedHistory(filePath);
    if (cachedHistory) {
      return { success: true, history: cachedHistory };
    }

    const getHistoryId = `get-history-${Date.now()}`;
    debugLogger.startTimer(getHistoryId);

    try {
      const encodedProjectPath = encodeURIComponent(projectPath);
      const encodedFilePath = encodeURIComponent(filePath);
      const response = await fetch(
        `http://localhost:3002/api/file-history?projectPath=${encodedProjectPath}&filePath=${encodedFilePath}`,
        { credentials: 'include' }
      );

      debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'File history response received', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get file history');
      }

      // Cache the result
      this.setCachedHistory(filePath, data.history);

      const duration = debugLogger.endTimer(getHistoryId, COMPONENT);
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'File history retrieved successfully', {
        filePath,
        versionCount: data.history?.length,
        durationMs: duration
      });

      return data;
    } catch (error) {
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Failed to get file history', {
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  async getSubfolders(currentPath = '') {
    const projectPath = this.pathValidation.getProjectPath();
    if (!projectPath) {
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'No project path set for getting subfolders');
      return { success: false, error: 'No project path set' };
    }

    const getFoldersId = `get-subfolders-${Date.now()}`;
    debugLogger.startTimer(getFoldersId);

    try {
      const fullPath = currentPath 
        ? `${projectPath}/${currentPath}` 
        : projectPath;
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
}

export default FileHistory;
