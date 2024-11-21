import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import FileWatcher from '../services/fileWatcher';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'FileWatcherContext';

const FileWatcherContext = createContext(null);

function FileWatcherProvider({ children }) {
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
  const watchersRef = useRef(fileWatchers);
  const initializationCount = useRef(0);

  // Keep watchersRef in sync with fileWatchers state
  useEffect(() => {
    watchersRef.current = fileWatchers;
  }, [fileWatchers]);

  // Cleanup on unmount
  useEffect(() => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'FileWatcherProvider mounted', {
      mountCount: ++initializationCount.current
    });
    
    return () => {
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'FileWatcherProvider unmounting', {
        mountCount: initializationCount.current,
        hasActiveWatchers: Object.values(watchersRef.current).some(w => w !== null)
      });

      isMounted.current = false;
      
      // Use watchersRef for cleanup to ensure we have latest state
      Object.entries(watchersRef.current).forEach(([type, watcher]) => {
        if (watcher) {
          debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, `Stopping watcher for ${type}`, {
            mountCount: initializationCount.current
          });
          watcher.destroy();
        }
      });
    };
  }, []); // Empty dependency array since we use refs

  const handleConnectionChange = useCallback((connected) => {
    if (!isMounted.current) {
      debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Connection state change ignored - component unmounted');
      return;
    }

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Connection state changed', {
      connected,
      mountCount: initializationCount.current
    });

    setIsMonitoring(connected);
    if (!connected) {
      setError('Disconnected from server');
    } else {
      setError('');
    }
  }, []);

  const createFileWatcher = useCallback((aiType) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Creating file watcher', {
      aiType,
      mountCount: initializationCount.current
    });
    
    return new FileWatcher(
      // onUpdate callback
      (type, data) => {
        if (!isMounted.current) {
          debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Update ignored - component unmounted');
          return;
        }

        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Received file update', {
          type,
          messageCount: data?.length,
          aiType,
          mountCount: initializationCount.current
        });

        try {
          setLastUpdated(new Date());
          
          const processedData = data?.filter(Boolean) || [];
          
          // Only update messages if this is the active AI
          if (aiType === activeAI) {
            setMessages(processedData);
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Messages updated', {
              messageType: type,
              aiType,
              count: processedData.length
            });
          }
          
          setError('');
        } catch (err) {
          const errorMsg = `Error processing ${aiType} messages: ${err.message}`;
          debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, errorMsg, {
            error: err.message,
            stack: err.stack
          });
          setError(errorMsg);
        }
      },
      // onConnectionChange callback
      handleConnectionChange
    );
  }, [activeAI, handleConnectionChange]);

  const initializeWatcher = useCallback(async (config, aiType) => {
    if (initializationInProgress.current) {
      debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Initialization already in progress', {
        aiType,
        mountCount: initializationCount.current
      });
      return;
    }

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Initializing watcher', {
      aiType,
      config,
      mountCount: initializationCount.current
    });

    initializationInProgress.current = true;

    try {
      if (!config.basePath || !config.taskFolder) {
        throw new Error('No monitoring path configured');
      }

      // Stop existing watcher if any
      const currentWatcher = watchersRef.current[aiType];
      if (currentWatcher) {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Stopping existing watcher', {
          aiType,
          mountCount: initializationCount.current
        });
        currentWatcher.destroy();
      }

      // Create new watcher
      const watcher = createFileWatcher(aiType);
      
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Setting paths', {
        basePath: config.basePath,
        taskFolder: config.taskFolder,
        mountCount: initializationCount.current
      });
      
      await watcher.setBasePath(config.basePath, config.taskFolder).validatePath();
      
      if (config.projectPath) {
        watcher.setProjectPath(config.projectPath);
      }
      
      if (!isMounted.current) {
        debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Component unmounted during initialization', {
          aiType,
          mountCount: initializationCount.current,
          phase: 'pre-start'
        });
        watcher.destroy();
        return;
      }

      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Starting watcher');
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

        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Watcher initialized successfully', {
          aiType,
          mountCount: initializationCount.current
        });
      } else {
        debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Component unmounted during initialization', {
          aiType,
          mountCount: initializationCount.current,
          phase: 'post-start'
        });
        watcher.destroy();
      }
    } catch (err) {
      const errorMsg = `Failed to start monitoring: ${err.message}`;
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, errorMsg, {
        error: err.message,
        stack: err.stack,
        mountCount: initializationCount.current
      });
      if (isMounted.current) {
        setError(errorMsg);
        setIsMonitoring(false);
      }
    } finally {
      initializationInProgress.current = false;
    }
  }, [createFileWatcher]);

  const stopWatcher = useCallback((aiType) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Stopping watcher', {
      aiType,
      mountCount: initializationCount.current
    });
    
    const currentWatcher = watchersRef.current[aiType];
    if (currentWatcher) {
      currentWatcher.destroy();
      setFileWatchers(prev => ({
        ...prev,
        [aiType]: null
      }));
      if (aiType === activeAI && isMounted.current) {
        setMessages([]);
        setError('');
        setIsMonitoring(false);
      }
    }
  }, [activeAI]);

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
}

FileWatcherProvider.propTypes = {
  children: PropTypes.node.isRequired
};

FileWatcherProvider.displayName = 'FileWatcherProvider';

// Include the hook in the default export
FileWatcherProvider.useFileWatcher = () => {
  const context = useContext(FileWatcherContext);
  if (!context) {
    throw new Error('useFileWatcher must be used within a FileWatcherProvider');
  }
  return context;
};

export default FileWatcherProvider;
