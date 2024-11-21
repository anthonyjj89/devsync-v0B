import { useState, useCallback } from 'react';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'useFileNavigation';

const useFileNavigation = ({ fileWatcher, initialFile }) => {
  const [selectedFile, setSelectedFile] = useState(initialFile);
  const [currentPath, setCurrentPath] = useState('');
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [watcherPath, setWatcherPath] = useState(fileWatcher?.projectPath);

  const loadEntries = useCallback(async () => {
    if (!fileWatcher?.projectPath) {
      setError('No project path configured');
      return;
    }

    setLoading(true);
    setError('');

    try {
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Loading project entries', { currentPath });
      const response = await fileWatcher.getSubfolders(currentPath);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load entries');
      }
      
      setEntries(response.entries || []);
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Entries loaded', { 
        count: response.entries?.length,
        currentPath
      });
    } catch (error) {
      setError(`Failed to load entries: ${error.message}`);
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error loading entries', { error });
    } finally {
      setLoading(false);
    }
  }, [fileWatcher, currentPath]);

  const handleEntryClick = useCallback((entry) => {
    if (entry.type === 'directory') {
      const newPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      setCurrentPath(newPath);
      setSelectedFile(null);
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Navigating to directory', { 
        newPath,
        entry 
      });
    } else {
      const filePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      setSelectedFile(filePath);
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Selected file', { 
        filePath,
        entry 
      });
    }
  }, [currentPath]);

  const handleBackClick = useCallback(() => {
    if (!currentPath) return;
    const lastSlashIndex = currentPath.lastIndexOf('/');
    const newPath = lastSlashIndex === -1 ? '' : currentPath.substring(0, lastSlashIndex);
    setCurrentPath(newPath);
    setSelectedFile(null);
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Navigating back', { 
      from: currentPath,
      to: newPath 
    });
  }, [currentPath]);

  const handleProjectPathChange = useCallback((newPath) => {
    if (newPath !== watcherPath) {
      setWatcherPath(newPath);
      // Reset state when project path changes
      setCurrentPath('');
      setSelectedFile(null);
      setEntries([]);
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Project path changed', {
        oldPath: watcherPath,
        newPath
      });
    }
  }, [watcherPath]);

  return {
    selectedFile,
    currentPath,
    entries,
    error,
    loading,
    watcherPath,
    loadEntries,
    handleEntryClick,
    handleBackClick,
    handleProjectPathChange
  };
};

export default useFileNavigation;
