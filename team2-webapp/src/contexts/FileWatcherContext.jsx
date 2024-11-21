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

  // Cleanup on unmount
  useEffect(() => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'FileWatcherProvider mounted');
    
    return () => {
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'FileWatcherProvider unmounting');
      isMounted.current = false;
      // Cleanup all watchers
      Object.entries(fileWatchers).forEach(([type, watcher]) => {
        if (watcher) {
          debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, `Stopping watcher for ${type}`);
          watcher.destroy();
        }
      });
    };
  }, [fileWatchers]); // Added fileWatchers to dependency array

  const handleConnectionChange = useCallback((connected) => {
    if (!isMounted.current) return;

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Connection state changed', {
      connected
    });

    setIsMonitoring(connected);
    if (!connected) {
      setError('Disconnected from server');
    } else {
      setError('');
    }
  }, []);

  const createFileWatcher = useCallback((aiType) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Creating file watcher', { aiType });
    
    return new FileWatcher(
      // onUpdate callback
      (type, data) => {
        if (!isMounted.current) return;

        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Received file update', {
          type,
          messageCount: data?.length,
          aiType
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
          debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, errorMsg, err);
          setError(errorMsg);
        }
      },
      // onConnectionChange callback
      handleConnectionChange
    );
  }, [activeAI, handleConnectionChange]);

  const initializeWatcher = useCallback(async (config, aiType) => {
    if (initializationInProgress.current) {
      debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Initialization already in progress');
      return;
    }

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Initializing watcher', {
      aiType,
      config
    });

    initializationInProgress.current = true;

    try {
      if (!config.basePath || !config.taskFolder) {
        throw new Error('No monitoring path configured');
      }

      // Stop existing watcher if any
      if (fileWatchers[aiType]) {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Stopping existing watcher', { aiType });
        fileWatchers[aiType].destroy();
      }

      // Create new watcher
      const watcher = createFileWatcher(aiType);
      
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Setting paths', {
        basePath: config.basePath,
        taskFolder: config.taskFolder
      });
      
      await watcher.setBasePath(config.basePath, config.taskFolder).validatePath();
      
      if (config.projectPath) {
        watcher.setProjectPath(config.projectPath);
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
          aiType
        });
      } else {
        debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Component unmounted during initialization');
        watcher.destroy();
      }
    } catch (err) {
      const errorMsg = `Failed to start monitoring: ${err.message}`;
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, errorMsg, {
        error: err.message,
        stack: err.stack
      });
      if (isMounted.current) {
        setError(errorMsg);
        setIsMonitoring(false);
      }
    } finally {
      initializationInProgress.current = false;
    }
  }, [fileWatchers, createFileWatcher]);

  const stopWatcher = useCallback((aiType) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Stopping watcher', { aiType });
    
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
