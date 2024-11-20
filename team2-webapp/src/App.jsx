import { useState, useEffect, useCallback } from 'react';
import FileWatcher from './services/fileWatcher';
import MessageList from './components/MessageList';
import PathInput from './components/PathInput';
import DevManagerDashboard from './components/DevManagerDashboard';
import ProjectOwnerDashboard from './components/ProjectOwnerDashboard';
import { debugLogger, DEBUG_LEVELS } from './utils/debug';
import './App.css';

const COMPONENT = 'App';

// Default path for monitoring VSCode extension files
const DEFAULT_PATH = 'C:/Users/antho/AppData/Roaming/Code/User/globalStorage/kodu-ai.claude-dev-experimental/tasks/1732044487428';

const ROLES = {
  DEFAULT: 'default',
  DEV_MANAGER: 'dev_manager',
  PROJECT_OWNER: 'project_owner'
};

function App() {
  const [claudeMessages, setClaudeMessages] = useState([]);
  const [apiMessages, setApiMessages] = useState([]);
  const [fileWatcher, setFileWatcher] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringPath, setMonitoringPath] = useState(DEFAULT_PATH);
  const [error, setError] = useState('');
  const [showDebug, setShowDebug] = useState(true);
  const [debugLogs, setDebugLogs] = useState([]);
  const [currentRole, setCurrentRole] = useState(ROLES.DEFAULT);

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
      await watcher.setBasePath(path).validatePath();
      await watcher.start();
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

  const renderContent = () => {
    switch (currentRole) {
      case ROLES.DEV_MANAGER:
        return <DevManagerDashboard messages={claudeMessages} />;
      case ROLES.PROJECT_OWNER:
        return <ProjectOwnerDashboard messages={claudeMessages} />;
      default:
        return (
          <div className="grid grid-cols-2 gap-5 h-[calc(100vh-200px)]">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
              <div className="p-4 border-b bg-gray-50 font-bold">
                Claude Messages ({claudeMessages.length})
              </div>
              <MessageList messages={claudeMessages} type="claude" />
            </div>
            <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
              <div className="p-4 border-b bg-gray-50 font-bold">
                API Messages ({apiMessages.length})
              </div>
              <MessageList messages={apiMessages} type="api" />
            </div>
          </div>
        );
    }
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
    <div className="min-h-screen bg-gray-100 p-5">
      {/* Role Selector */}
      <div className="mb-4 flex gap-2">
        {Object.values(ROLES).map(role => (
          <button
            key={role}
            onClick={() => setCurrentRole(role)}
            className={`px-4 py-2 rounded-md ${
              currentRole === role
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {role.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      <PathInput onPathValidated={handlePathValidated} />
      
      <div className={`text-center p-3 mb-4 rounded-md ${
        error 
          ? 'bg-red-100 text-red-700' 
          : (isMonitoring ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700')
      }`}>
        {statusText}
      </div>

      <button 
        onClick={() => setShowDebug(!showDebug)}
        className={`mb-4 px-4 py-2 rounded-md ${
          showDebug ? 'bg-red-500' : 'bg-green-500'
        } text-white`}
      >
        {showDebug ? 'Hide Debug Panel' : 'Show Debug Panel'}
      </button>

      {renderContent()}

      {showDebug && (
        <div className="mt-5 bg-gray-900 text-white p-4 h-48 overflow-y-auto rounded-lg font-mono text-sm">
          {debugLogs.map((log, index) => (
            <div key={index} className="mb-1 whitespace-pre-wrap">
              [{log.timestamp}] {log.message}
              {log.data && (
                <pre className="text-xs text-gray-400">{log.data}</pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
