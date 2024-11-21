import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import FileWatcher from '../services/fileWatcher';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'FileWatcherContext';

const FileWatcherContext = createContext(null);

export const FileWatcherProvider = ({ children }) => {
  const [fileWatchers, setFileWatchers] = useState({
    kodu: null,
    cline: null
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [activeAI, setActiveAI] = useState('kodu');

  // Use refs to track mounted state and prevent updates after unmount
  const isMounted = useRef(true);
  const initializationInProgress = useRef(false);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      // Cleanup all watchers
      Object.values(fileWatchers).forEach(watcher => {
        if (watcher) {
          watcher.destroy();
        }
      });
    };
  }, []);

  const handleConnectionChange = useCallback((connected) => {
    if (!isMounted.current) return;

    setIsMonitoring(connected);
    if (!connected) {
      setError('Disconnected from server');
    } else {
      setError('');
    }
  }, []);

  const createFileWatcher = useCallback((aiType) => {
    return new FileWatcher(
      // onUpdate callback
      (type, data) => {
        if (!isMounted.current) return;

        const updateId = `update-${aiType}-${type}-${Date.now()}`;
        debugLogger.startTimer(updateId);

        try {
          setLastUpdated(new Date());
          
          const processedData = data?.filter(Boolean) || [];
          
          // Only update messages if this is the active AI
          if (aiType === activeAI) {
            setMessages(processedData);
            debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Messages updated', {
              messageType: type,
              aiType,
              count: processedData.length
            });
          }
          
          setError('');

          debugLogger.endTimer(updateId, COMPONENT);
        } catch (err) {
          if (isMounted.current) {
            const errorMsg = `Error processing ${aiType} messages: ${err.message}`;
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, errorMsg, err);
            setError(errorMsg);
          }
        }
      },
      // onConnectionChange callback
      handleConnectionChange
    );
  }, [activeAI, handleConnectionChange]);

  const initializeWatcher = useCallback(async (config, aiType) => {
    if (initializationInProgress.current) return;
    initializationInProgress.current = true;

    try {
      if (!config.basePath || !config.taskFolder) {
        throw new Error('No monitoring path configured');
      }

      debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Starting monitoring with config:', {
        aiType,
        config
      });

      // Stop existing watcher if any
      if (fileWatchers[aiType]) {
        fileWatchers[aiType].destroy();
      }

      // Create new watcher
      const watcher = createFileWatcher(aiType);
      await watcher.setBasePath(config.basePath, config.taskFolder).validatePath();
      
      if (config.projectPath) {
        watcher.setProjectPath(config.projectPath);
      }
      
      await watcher.start();

      if (isMounted.current) {
        // Update watchers
        setFileWatchers(prev => ({
          ...prev,
          [aiType]: watcher
        }));

        setActiveAI(aiType);
        setLastUpdated(new Date());
        setMessages([]); // Clear messages when switching AI

        debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Successfully started monitoring', {
          aiType
        });
      } else {
        // If component unmounted during initialization, cleanup the watcher
        watcher.destroy();
      }
    } catch (err) {
      if (isMounted.current) {
        const errorMsg = `Failed to start monitoring: ${err.message}`;
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, errorMsg, err);
        setError(errorMsg);
        setIsMonitoring(false);
      }
    } finally {
      initializationInProgress.current = false;
    }
  }, [fileWatchers, createFileWatcher]);

  const stopWatcher = useCallback((aiType) => {
    if (fileWatchers[aiType]) {
      fileWatchers[aiType].destroy();
      setFileWatchers(prev => ({
        ...prev,
        [aiType]: null
      }));
      if (aiType === activeAI && isMounted.current) {
        setMessages([]);
        setError('');
        setIsMonitoring(false);
      }
      debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'File watcher stopped', {
        aiType
      });
    }
  }, [fileWatchers, activeAI]);

  const value = {
    fileWatcher: fileWatchers[activeAI], // For backward compatibility
    fileWatchers,
    isMonitoring,
    lastUpdated,
    messages,
    error,
    activeAI,
    initializeWatcher,
    stopWatcher,
    setActiveAI
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
