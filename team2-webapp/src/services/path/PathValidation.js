import { debugLogger, DEBUG_LEVELS } from '../../utils/debug';

const COMPONENT = 'PathValidation';

class PathValidation {
  constructor() {
    this.basePath = null;
    this.taskFolder = null;
    this.projectPath = null;
  }

  setBasePath(path, taskFolder = '') {
    this.basePath = path;
    this.taskFolder = taskFolder;
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Paths set', {
      basePath: this.basePath,
      taskFolder: this.taskFolder
    });
    return this;
  }

  setProjectPath(path) {
    this.projectPath = path;
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Project path set', {
      projectPath: this.projectPath
    });
    return this;
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

  getBasePath() {
    return this.basePath;
  }

  getTaskFolder() {
    return this.taskFolder;
  }

  getProjectPath() {
    return this.projectPath;
  }
}

export default PathValidation;
