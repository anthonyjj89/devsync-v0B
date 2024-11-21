import { useState, useCallback, useEffect } from 'react';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'useDebugLogs';

const useDebugLogs = () => {
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);

  // Subscribe to debug logger events
  useEffect(() => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Initializing debug log listener');

    const handleLog = (logEntry) => {
      setDebugLogs(prev => {
        const updatedLogs = [...prev, {
          timestamp: logEntry.timestamp,
          message: `[${logEntry.level}] [${logEntry.component}] ${logEntry.message}`,
          data: logEntry.data
        }];
        return updatedLogs.slice(-100); // Keep last 100 logs
      });
    };

    // Subscribe to logger events
    const unsubscribe = debugLogger.subscribe(handleLog);

    return () => {
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Cleaning up debug log listener');
      unsubscribe();
    };
  }, []);

  const addDebugLog = useCallback((message, data = null) => {
    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, message, data);
  }, []);

  const toggleDebug = useCallback(() => {
    setShowDebug(prev => {
      const newState = !prev;
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, `Debug panel ${newState ? 'shown' : 'hidden'}`);
      return newState;
    });
  }, []);

  const clearLogs = useCallback(() => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Clearing debug logs');
    setDebugLogs([]);
  }, []);

  return {
    showDebug,
    debugLogs,
    addDebugLog,
    toggleDebug,
    clearLogs
  };
};

export default useDebugLogs;
