import { useState, useCallback } from 'react';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'useMessageSettings';

const useMessageSettings = ({ aiType, taskFolder, onTaskFolderChange }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(() => {
    return localStorage.getItem(`${aiType}AI.advancedMode`) === 'true';
  });

  const toggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Settings visibility toggled', {
      aiType,
      showSettings: !showSettings
    });
  }, [showSettings, aiType]);

  const toggleAdvancedMode = useCallback((value) => {
    setAdvancedMode(value);
    localStorage.setItem(`${aiType}AI.advancedMode`, value);
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Advanced mode toggled', {
      aiType,
      advancedMode: value
    });
  }, [aiType]);

  const handleSettingsSave = useCallback((settings) => {
    // Update task folder if it changed
    if (settings.taskFolder !== taskFolder) {
      onTaskFolderChange(settings.taskFolder);
    }

    // Update advanced mode if it changed
    if (settings.advancedMode !== advancedMode) {
      toggleAdvancedMode(settings.advancedMode);
    }

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Settings saved', {
      aiType,
      settings
    });
  }, [aiType, taskFolder, advancedMode, onTaskFolderChange, toggleAdvancedMode]);

  return {
    showSettings,
    advancedMode,
    handleSettingsSave,
    toggleSettings,
    toggleAdvancedMode
  };
};

export default useMessageSettings;
