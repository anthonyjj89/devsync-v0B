import { useState, useEffect, useCallback } from 'react';
import FileWatcher from './services/fileWatcher';
import MessageList from './components/MessageList';
import PathInput from './components/PathInput';
import { debugLogger, DEBUG_LEVELS } from './utils/debug';
import './App.css';

const COMPONENT = 'App';

// Default path for monitoring VSCode extension files
const DEFAULT_PATH = 'C:/Users/antho/AppData/Roaming/Code/User/globalStorage/kodu-ai.claude-dev-experimental/tasks/1732044487428';

function App() {
  const [claudeMessages, setClaudeMessages] = useState([]);
  const [apiMessages, setApiMessages] = useState([]);
  const [fileWatcher, setFileWatcher] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringPath, setMonitoringPath] = useState(DEFAULT_PATH);
  const [error, setError] = useState('');
  const [showDebug, setShowDebug] = useState(true);
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
      // Limit debug logs to last 50 entries
      const updatedLogs = [...prev, logEntry];
      return updatedLogs.slice(-50);
    });
  }, []);

  useEffect(() => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Initializing App');

    const watcher = new FileWatcher((type, data) => {
      const updateId = `update-${type}-${Date.now()}`;
      debugLogger.startTimer(updateId);

      try {
        addDebugLog(`Received ${type} messages update`, data);
        
        if (type === 'claude') {
          setClaudeMessages(data || []);
          addDebugLog('Updated claude messages', data);
        } else if (type === 'api') {
          setApiMessages(data || []);
          addDebugLog('Updated api messages', data);
        }
        
        // Clear any existing errors when successful update occurs
        setError('');

        const duration = debugLogger.endTimer(updateId, COMPONENT);
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, `${type} messages update completed`, {
          messageCount: data?.length || 0,
          durationMs: duration
        });
      } catch (err) {
        const errorMsg = `Error processing ${type} messages: ${err.message}`;
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, errorMsg, err);
        addDebugLog(errorMsg, err);
        setError(errorMsg);
      }
    });

    setFileWatcher(watcher);

    // Initialize with default path
    initializeWatcher(watcher, DEFAULT_PATH);

    return () => {
      if (watcher) {
        watcher.stop();
      }
    };
  }, [addDebugLog]);

  const initializeWatcher = async (watcher, path) => {
    try {
      addDebugLog('Starting monitoring for path:', path);
      
      // Validate and start monitoring path
      await watcher.setBasePath(path).validatePath();
      await watcher.start(); // Now waiting for start to complete
      
      setIsMonitoring(true);
      setMonitoringPath(path);
      addDebugLog('Successfully started monitoring path:', path);
    } catch (err) {
      const errorMsg = `Failed to start monitoring: ${err.message}`;
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, errorMsg, err);
      setError(errorMsg);
      setIsMonitoring(false);
      setMonitoringPath('');
      addDebugLog('Error starting monitoring:', err);
    }
  };

  const handlePathValidated = async (path) => {
    if (fileWatcher) {
      try {
        // Stop any existing monitoring
        fileWatcher.stop();
        setClaudeMessages([]);
        setApiMessages([]);
        setError('');
        
        await initializeWatcher(fileWatcher, path);
      } catch (err) {
        const errorMsg = `Failed to start monitoring: ${err.message}`;
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, errorMsg, err);
        setError(errorMsg);
        setIsMonitoring(false);
        setMonitoringPath('');
        addDebugLog('Error starting monitoring:', err);
      }
    }
  };

  const containerStyle = {
    padding: '20px',
    backgroundColor: '#f0f2f5',
    minHeight: '100vh',
  };

  const contentStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    height: showDebug ? 'calc(100vh - 400px)' : 'calc(100vh - 200px)',
  };

  const columnStyle = {
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle = {
    padding: '15px',
    borderBottom: '1px solid #e0e0e0',
    fontWeight: 'bold',
    backgroundColor: '#f8f9fa',
  };

  const statusStyle = {
    textAlign: 'center',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e0e0e0',
    color: error ? '#dc3545' : (isMonitoring ? '#28a745' : '#6c757d'),
  };

  const debugPanelStyle = {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    padding: '10px',
    height: '200px',
    overflowY: 'auto',
    fontFamily: 'monospace',
    fontSize: '12px',
    marginTop: '20px',
    borderRadius: '10px',
  };

  const debugButtonStyle = {
    padding: '8px 16px',
    backgroundColor: showDebug ? '#dc3545' : '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '10px',
  };

  const statusText = error 
    ? error 
    : (isMonitoring 
      ? `Monitoring: ${monitoringPath}` 
      : 'Enter path to start monitoring');

  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Rendering App', {
    isMonitoring,
    hasError: !!error,
    claudeMessagesCount: claudeMessages.length,
    apiMessagesCount: apiMessages.length,
    debugLogsCount: debugLogs.length
  });

  return (
    <div style={containerStyle}>
      <PathInput onPathValidated={handlePathValidated} />
      <div style={statusStyle}>{statusText}</div>
      <button 
        style={debugButtonStyle}
        onClick={() => setShowDebug(!showDebug)}
      >
        {showDebug ? 'Hide Debug Panel' : 'Show Debug Panel'}
      </button>
      <div style={contentStyle}>
        <div style={columnStyle}>
          <div style={headerStyle}>Claude Messages ({claudeMessages.length})</div>
          <MessageList messages={claudeMessages} type="claude" />
        </div>
        <div style={columnStyle}>
          <div style={headerStyle}>API Messages ({apiMessages.length})</div>
          <MessageList messages={apiMessages} type="api" />
        </div>
      </div>
      {showDebug && (
        <div style={debugPanelStyle}>
          {debugLogs.map((log, index) => (
            <div key={index} style={{ marginBottom: '4px', whiteSpace: 'pre-wrap' }}>
              [{log.timestamp}] {log.message}
              {log.data && <pre style={{fontSize: '10px', color: '#aaa'}}>{log.data}</pre>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
