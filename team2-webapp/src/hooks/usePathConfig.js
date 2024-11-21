import { useState, useCallback, useEffect } from 'react';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'usePathConfig';

const usePathConfig = () => {
  const [monitoringConfig, setMonitoringConfig] = useState(() => {
    const koduPath = localStorage.getItem('koduAI.path');
    const koduTaskFolder = localStorage.getItem('koduAI.taskFolder');
    return {
      basePath: koduPath || '',
      taskFolder: koduTaskFolder || '',
      projectPath: localStorage.getItem('project.path') || ''
    };
  });

  const [error, setError] = useState('');

  useEffect(() => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Initial path config loaded', monitoringConfig);
  }, []);

  const handlePathsUpdate = useCallback(async (newConfig) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Configuration update requested', {
      oldConfig: monitoringConfig,
      newConfig
    });

    // Determine which AI to use based on enabled state and path changes
    let basePath = '';
    let taskFolder = '';
    let aiType = '';

    if (newConfig.enabledAIs.kodu && newConfig.koduPath && newConfig.koduTaskFolder) {
      const koduPathChanged = newConfig.koduPath !== localStorage.getItem('koduAI.path') ||
                           newConfig.koduTaskFolder !== localStorage.getItem('koduAI.taskFolder');
      
      if (!newConfig.enabledAIs.cline || koduPathChanged) {
        basePath = newConfig.koduPath;
        taskFolder = newConfig.koduTaskFolder;
        aiType = 'kodu';
      }
    }

    if (newConfig.enabledAIs.cline && newConfig.clinePath && newConfig.clineTaskFolder && !basePath) {
      basePath = newConfig.clinePath;
      taskFolder = newConfig.clineTaskFolder;
      aiType = 'cline';
    }

    if (!basePath || !taskFolder) {
      const errorMsg = 'No valid AI configuration found. Please enable and configure at least one AI.';
      setError(errorMsg);
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, errorMsg);
      return { success: false, error: errorMsg };
    }

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Selected AI configuration', {
      aiType,
      basePath,
      taskFolder
    });

    // Update monitoring config
    const updatedConfig = {
      basePath,
      taskFolder,
      projectPath: newConfig.projectPath
    };
    setMonitoringConfig(updatedConfig);
    setError('');

    return {
      success: true,
      config: updatedConfig,
      aiType
    };
  }, [monitoringConfig]);

  const isPathConfigured = useCallback((activeTab) => {
    if (activeTab === 'kodu') {
      const koduPath = localStorage.getItem('koduAI.path');
      const koduTaskFolder = localStorage.getItem('koduAI.taskFolder');
      return !!koduPath && !!koduTaskFolder;
    } else if (activeTab === 'cline') {
      const clinePath = localStorage.getItem('clineAI.path');
      const clineTaskFolder = localStorage.getItem('clineAI.taskFolder');
      return !!clinePath && !!clineTaskFolder;
    } else if (activeTab === 'files') {
      return !!monitoringConfig.projectPath;
    }
    return true;
  }, [monitoringConfig.projectPath]);

  return {
    monitoringConfig,
    error,
    handlePathsUpdate,
    isPathConfigured
  };
};

export default usePathConfig;
