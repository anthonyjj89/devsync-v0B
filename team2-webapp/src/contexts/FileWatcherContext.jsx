import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import FileWatcher from '../services/fileWatcher';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'FileWatcherContext';

const FileWatcherContext = createContext(null);

export const FileWatcherProvider = ({ children }) => {
  const [fileWatcher, setFileWatcher] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');

  const createFileWatcher = useCallback(() => {
    return new FileWatcher((type, data) => {
      const updateId = `update-${type}-${Date.now()}`;
      debugLogger.startTimer(updateId);

      try {
        setLastUpdated(new Date());
        
        const processedData = data?.filter(Boolean) || [];
        
        if (type === 'claude') {
          setMessages(processedData);
          debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Messages updated', {
            count: processedData.length
          });
        }
        
        setError('');

        const duration = debugLogger.endTimer(updateId, COMPONENT);
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, `${type} messages update completed`, {
          messageCount: processedData.length,
          durationMs: duration
        });
      } catch (err) {
        const errorMsg = `Error processing ${type} messages: ${err.message}`;
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, errorMsg, err);
        setError(errorMsg);
      }
    });
  }, []);

  const initializeWatcher = useCallback(async (watcher, config) => {
    try {
      if (!config.basePath || !config.taskFolder) {
        throw new Error('No monitoring path configured');
      }

      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Starting monitoring with config:', config);
      await watcher.setBasePath(config.basePath, config.taskFolder).validatePath();
      
      if (config.projectPath) {
        watcher.setProjectPath(config.projectPath);
      }
      
      await watcher.start();
      setIsMonitoring(true);
      setLastUpdated(new Date());
      setError('');
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Successfully started monitoring');
    } catch (err) {
      const errorMsg = `Failed to start monitoring: ${err.message}`;
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, errorMsg, err);
      setError(errorMsg);
      setIsMonitoring(false);
    }
  }, []);

  const stopWatcher = useCallback(() => {
    if (fileWatcher) {
      fileWatcher.stop();
      setMessages([]);
      setError('');
      setIsMonitoring(false);
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'File watcher stopped');
    }
  }, [fileWatcher]);

  useEffect(() => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Initializing FileWatcherContext');
    const watcher = createFileWatcher();
    setFileWatcher(watcher);

    return () => {
      if (watcher) {
        watcher.stop();
      }
    };
  }, [createFileWatcher]);

  const value = {
    fileWatcher,
    isMonitoring,
    lastUpdated,
    messages,
    error,
    initializeWatcher,
    stopWatcher
  };

  return (
    <FileWatcherContext.Provider value={value}>
      {children}
    </FileWatcherContext.Provider>
  );
};

FileWatcherProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useFileWatcher = () => {
  const context = useContext(FileWatcherContext);
  if (!context) {
    throw new Error('useFileWatcher must be used within a FileWatcherProvider');
  }
  return context;
};

export default FileWatcherContext;
