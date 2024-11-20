import { useState, useEffect, useCallback } from 'react';
import FileWatcher from './services/fileWatcher';
import MessageList from './components/MessageList';
import DevManagerDashboard from './components/DevManagerDashboard';
import ProjectOwnerDashboard from './components/ProjectOwnerDashboard';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import { debugLogger, DEBUG_LEVELS } from './utils/debug';
import './App.css';

const COMPONENT = 'App';

function App() {
  const [claudeMessages, setClaudeMessages] = useState([]);
  const [apiMessages, setApiMessages] = useState([]);
  const [fileWatcher, setFileWatcher] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringPath, setMonitoringPath] = useState(() => {
    const koduPath = localStorage.getItem('koduAI.path');
    const koduTaskFolder = localStorage.getItem('koduAI.taskFolder');
    return koduPath && koduTaskFolder ? `${koduPath}/${koduTaskFolder}` : '';
  });
  const [error, setError] = useState('');
  const [showDebug, setShowDebug] = useState(true);
  const [debugLogs, setDebugLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('kodu');

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
    if (monitoringPath) {
      initializeWatcher(watcher, monitoringPath);
    }

    return () => {
      if (watcher) {
        watcher.stop();
      }
    };
  }, [addDebugLog, monitoringPath]);

  const initializeWatcher = async (watcher, path) => {
    try {
      if (!path) {
        throw new Error('No monitoring path configured');
      }

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

  const handlePathsUpdate = (newConfig) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Configuration updated', {
      oldPath: monitoringPath,
      newConfig
    });

    const basePath = activeTab === 'kodu' ? newConfig.koduPath : newConfig.clinePath;
    const taskFolder = activeTab === 'kodu' ? newConfig.koduTaskFolder : newConfig.clineTaskFolder;
    
    if (!basePath || !taskFolder) {
      setError('Both path and task folder must be configured');
      return;
    }

    const fullPath = `${basePath}/${taskFolder}`;
    setMonitoringPath(fullPath);

    if (fileWatcher) {
      fileWatcher.stop();
      setClaudeMessages([]);
      setApiMessages([]);
      setError('');
      initializeWatcher(fileWatcher, fullPath);
    }
  };

  const isPathConfigured = () => {
    if (activeTab === 'kodu') {
      const koduPath = localStorage.getItem('koduAI.path');
      const koduTaskFolder = localStorage.getItem('koduAI.taskFolder');
      return !!koduPath && !!koduTaskFolder;
    } else {
      const clinePath = localStorage.getItem('clineAI.path');
      const clineTaskFolder = localStorage.getItem('clineAI.taskFolder');
      return !!clinePath && !!clineTaskFolder;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'kodu':
      case 'cline':
        if (!isPathConfigured()) {
          return (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-8 bg-white rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4">Configuration Required</h2>
                <p className="text-gray-600 mb-4">
                  Please configure both the path and task folder for {activeTab === 'kodu' ? 'Kodu' : 'Cline'} AI in settings.
                </p>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Go to Settings
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="flex-1 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <div className={`text-center p-3 rounded-md ${
                error 
                  ? 'bg-red-100 text-red-700' 
                  : (isMonitoring ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700')
              }`}>
                {error || (isMonitoring ? `Monitoring: ${monitoringPath}` : 'Not monitoring any path')}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5 p-5">
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
          </div>
        );
      case 'dev-manager':
        return <DevManagerDashboard messages={claudeMessages} />;
      case 'project-manager':
        return <ProjectOwnerDashboard messages={claudeMessages} />;
      case 'settings':
        return <Settings onSave={handlePathsUpdate} />;
      default:
        return null;
    }
  };

  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Rendering App', {
    isMonitoring,
    hasError: !!error,
    claudeMessagesCount: claudeMessages.length,
    apiMessagesCount: apiMessages.length,
    debugLogsCount: debugLogs.length,
    activeTab
  });

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar 
        activeTab={activeTab}
        onTabChange={tab => {
          setActiveTab(tab);
          setError(''); // Clear any errors when switching tabs
        }}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}

        <button 
          onClick={() => setShowDebug(!showDebug)}
          className={`m-4 px-4 py-2 rounded-md ${
            showDebug ? 'bg-red-500' : 'bg-green-500'
          } text-white self-end transition-colors`}
        >
          {showDebug ? 'Hide Debug Panel' : 'Show Debug Panel'}
        </button>

        {showDebug && (
          <div className="m-4 bg-gray-900 text-white p-4 h-48 overflow-y-auto rounded-lg font-mono text-sm">
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
      </main>
    </div>
  );
}

export default App;
