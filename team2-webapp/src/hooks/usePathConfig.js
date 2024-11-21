import { useState, useCallback, useEffect } from 'react';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'usePathConfig';

const DEFAULT_VSCODE_PATH = 'C:/Users/antho/AppData/Roaming/Code/User/globalStorage/kodu-ai.claude-dev-experimental/tasks';

const usePathConfig = () => {
  const [monitoringConfig, setMonitoringConfig] = useState(() => {
    return {
      koduPath: localStorage.getItem('koduAI.path') || DEFAULT_VSCODE_PATH,
      koduTaskFolder: localStorage.getItem('koduAI.taskFolder') || '',
      clinePath: localStorage.getItem('clineAI.path') || DEFAULT_VSCODE_PATH,
      clineTaskFolder: localStorage.getItem('clineAI.taskFolder') || '',
      projectPath: localStorage.getItem('project.path') || '',
      enabledAIs: {
        kodu: localStorage.getItem('koduAI.enabled') !== 'false',
        cline: localStorage.getItem('clineAI.enabled') !== 'false'
      }
    };
  });

  const [error, setError] = useState('');

  useEffect(() => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Initial path config loaded', monitoringConfig);
  }, [monitoringConfig]); // Added monitoringConfig to dependency array

  const handlePathsUpdate = useCallback(async (newConfig) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Configuration update requested', {
      oldConfig: monitoringConfig,
      newConfig
    });

    try {
      // Validate paths
      if (!newConfig.projectPath && newConfig.projectPath !== monitoringConfig.projectPath) {
        throw new Error('Project path is required');
      }

      if (newConfig.enabledAIs?.kodu && (!newConfig.koduPath || !newConfig.koduTaskFolder)) {
        throw new Error('Kodu AI path and task folder are required when enabled');
      }

      if (newConfig.enabledAIs?.cline && (!newConfig.clinePath || !newConfig.clineTaskFolder)) {
        throw new Error('Cline AI path and task folder are required when enabled');
      }

      // Update only the changed values
      const updatedConfig = {
        ...monitoringConfig,
        ...newConfig
      };

      // Save to localStorage
      if (newConfig.projectPath) {
        localStorage.setItem('project.path', newConfig.projectPath);
      }
      if (newConfig.koduPath) {
        localStorage.setItem('koduAI.path', newConfig.koduPath);
      }
      if (newConfig.koduTaskFolder) {
        localStorage.setItem('koduAI.taskFolder', newConfig.koduTaskFolder);
      }
      if (newConfig.enabledAIs?.kodu !== undefined) {
        localStorage.setItem('koduAI.enabled', newConfig.enabledAIs.kodu);
      }
      if (newConfig.clinePath) {
        localStorage.setItem('clineAI.path', newConfig.clinePath);
      }
      if (newConfig.clineTaskFolder) {
        localStorage.setItem('clineAI.taskFolder', newConfig.clineTaskFolder);
      }
      if (newConfig.enabledAIs?.cline !== undefined) {
        localStorage.setItem('clineAI.enabled', newConfig.enabledAIs.cline);
      }

      setMonitoringConfig(updatedConfig);
      setError('');

      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Configuration updated successfully', updatedConfig);
      return { success: true, config: updatedConfig };
    } catch (err) {
      const errorMsg = err.message;
      setError(errorMsg);
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error updating configuration', err);
      return { success: false, error: errorMsg };
    }
  }, [monitoringConfig]);

  const isPathConfigured = useCallback((activeTab) => {
    switch (activeTab) {
      case 'kodu':
        return !!monitoringConfig.koduPath && !!monitoringConfig.koduTaskFolder;
      case 'cline':
        return !!monitoringConfig.clinePath && !!monitoringConfig.clineTaskFolder;
      case 'files':
        return !!monitoringConfig.projectPath;
      default:
        return true;
    }
  }, [monitoringConfig]);

  return {
    monitoringConfig,
    error,
    handlePathsUpdate,
    isPathConfigured
  };
};

export default usePathConfig;
