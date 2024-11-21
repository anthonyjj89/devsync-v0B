import { useState, useCallback } from 'react';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'useDebugLogs';

const useDebugLogs = () => {
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);

  const addDebugLog = useCallback((message, data = null) => {
    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      message: typeof message === 'string' 
        ? message 
        : JSON.stringify(message, null, 2),
      data: data ? JSON.stringify(data, null, 2) : null
    };
    
    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, logEntry.message, data);
    
    setDebugLogs(prev => {
      const updatedLogs = [...prev, logEntry];
      return updatedLogs.slice(-50); // Keep last 50 logs
    });
  }, []);

  const toggleDebug = useCallback(() => {
    setShowDebug(prev => !prev);
  }, []);

  return {
    showDebug,
    debugLogs,
    addDebugLog,
    toggleDebug
  };
};

export default useDebugLogs;
