import { useState, useCallback } from 'react';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'useMessageSettings';

const useMessageSettings = ({ taskFolder, onTaskFolderChange }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);

  const handleSettingsSave = useCallback((config) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Settings updated', config);
    
    if (config.koduTaskFolder !== taskFolder) {
      onTaskFolderChange(config.koduTaskFolder);
    }
  }, [taskFolder, onTaskFolderChange]);

  const toggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Settings visibility toggled');
  }, []);

  const toggleAdvancedMode = useCallback((enabled) => {
    setAdvancedMode(enabled);
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Advanced mode toggled', { enabled });
  }, []);

  return {
    showSettings,
    advancedMode,
    handleSettingsSave,
    toggleSettings,
    toggleAdvancedMode
  };
};

export default useMessageSettings;
