import { useState, useEffect, useCallback } from 'react';
import FileWatcher from './services/fileWatcher';
import MessageList from './components/MessageList';
import DevManagerDashboard from './components/DevManagerDashboard';
import ProjectOwnerDashboard from './components/ProjectOwnerDashboard';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import { debugLogger, DEBUG_LEVELS } from './utils/debug';
import { processMessageContent } from './utils/messageProcessor';
import './App.css';

const COMPONENT = 'App';
const PATH_SEPARATOR = navigator.platform.toLowerCase().includes('win') ? '\\' : '/';

function App() {
  const [messages, setMessages] = useState([]);
  const [fileWatcher, setFileWatcher] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [showMessageSettings, setShowMessageSettings] = useState(false);
  const [monitoringConfig, setMonitoringConfig] = useState(() => {
    const koduPath = localStorage.getItem('koduAI.path');
    const koduTaskFolder = localStorage.getItem('koduAI.taskFolder');
    return {
      basePath: koduPath || '',
      taskFolder: koduTaskFolder || ''
    };
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
        setLastUpdated(new Date());
        
        // Process messages using our enhanced processor
        const processedData = data?.map(msg => {
          // Pass the entire message object to processMessageContent
          const processedContent = processMessageContent(msg, advancedMode);
          if (!processedContent) return null;

          // Log the message processing for debugging
          debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Processing message', {
            originalMessage: msg,
            processedContent,
            messageType: type
          });

          return {
            ...msg,
            text: processedContent.content,
            type: processedContent.type,
            role: processedContent.role,
            metadata: {
              ...processedContent.metadata,
              source: type,
              processedRole: processedContent.role // For debugging
            },
            timestamp: msg.ts || Date.now()
          };
        }).filter(Boolean) || [];
        
        if (type === 'claude') {
          setMessages(processedData);
          addDebugLog('Updated messages', {
            count: processedData.length,
            roles: processedData.map(msg => msg.role)
          });
        }
        
        setError('');

        const duration = debugLogger.endTimer(updateId, COMPONENT);
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, `${type} messages update completed`, {
          messageCount: processedData.length,
          durationMs: duration,
          roles: processedData.map(msg => msg.role)
        });
      } catch (err) {
        const errorMsg = `Error processing ${type} messages: ${err.message}`;
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, errorMsg, err);
        addDebugLog(errorMsg, err);
        setError(errorMsg);
      }
    });

    setFileWatcher(watcher);
    if (monitoringConfig.basePath && monitoringConfig.taskFolder) {
      initializeWatcher(watcher, monitoringConfig);
    }

    return () => {
      if (watcher) {
        watcher.stop();
      }
    };
  }, [addDebugLog, monitoringConfig, advancedMode]);

  const initializeWatcher = async (watcher, config) => {
    try {
      if (!config.basePath || !config.taskFolder) {
        throw new Error('No monitoring path configured');
      }

      addDebugLog('Starting monitoring with config:', config);
      await watcher.setBasePath(config.basePath, config.taskFolder).validatePath();
      await watcher.start();
      setIsMonitoring(true);
      setLastUpdated(new Date());
      addDebugLog('Successfully started monitoring');
    } catch (err) {
      const errorMsg = `Failed to start monitoring: ${err.message}`;
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, errorMsg, err);
      setError(errorMsg);
      setIsMonitoring(false);
      addDebugLog('Error starting monitoring:', err);
    }
  };

  const handlePathsUpdate = (newConfig) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Configuration updated', {
      oldConfig: monitoringConfig,
      newConfig
    });

    const basePath = activeTab === 'kodu' ? newConfig.koduPath : newConfig.clinePath;
    const taskFolder = activeTab === 'kodu' ? newConfig.koduTaskFolder : newConfig.clineTaskFolder;
    
    if (!basePath || !taskFolder) {
      setError('Both path and task folder must be configured');
      return;
    }

    setMonitoringConfig({
      basePath,
      taskFolder
    });

    if (fileWatcher) {
      fileWatcher.stop();
      setMessages([]);
      setError('');
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

  const getDisplayPath = () => {
    if (!monitoringConfig.basePath || !monitoringConfig.taskFolder) return '';
    return `${monitoringConfig.basePath}${PATH_SEPARATOR}${monitoringConfig.taskFolder}`;
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
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">
                    {isMonitoring ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                {lastUpdated && (
                  <div className="text-sm text-gray-600">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
                <div 
                  className="text-sm text-gray-600 cursor-help"
                  title={getDisplayPath()}
                >
                  {monitoringConfig.taskFolder}
                </div>
              </div>
              {error && (
                <div className="mt-2 text-center p-2 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}
            </div>
            <div className={`flex-1 p-5 min-h-0 ${showDebug ? 'pb-72' : 'pb-20'}`}>
              <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-full">
                <div className="p-4 border-b bg-gray-50 font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>Messages ({messages.length})</span>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowMessageSettings(!showMessageSettings)}
                      className="p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-200"
                      title="Message Settings"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {showMessageSettings && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                        <label className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={advancedMode}
                            onChange={() => setAdvancedMode(!advancedMode)}
                            className="mr-2"
                          />
                          Advanced Mode
                        </label>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <MessageList 
                    messages={messages}
                    advancedMode={advancedMode}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 'dev-manager':
        return <DevManagerDashboard messages={messages} />;
      case 'project-manager':
        return <ProjectOwnerDashboard messages={messages} />;
      case 'settings':
        return <Settings onSave={handlePathsUpdate} />;
      default:
        return null;
    }
  };

  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Rendering App', {
    isMonitoring,
    hasError: !!error,
    messagesCount: messages.length,
    debugLogsCount: debugLogs.length,
    activeTab,
    monitoringConfig,
    advancedMode
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

        <div className="fixed bottom-0 left-0 right-0 z-10">
          <div className="bg-gray-100 px-5 py-4 border-t">
            <button 
              onClick={() => setShowDebug(!showDebug)}
              className={`px-4 py-2 rounded-lg ${
                showDebug ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
              } text-white transition-colors shadow-sm`}
            >
              {showDebug ? 'Hide Debug Panel' : 'Show Debug Panel'}
            </button>

            {showDebug && (
              <div className="mt-3 bg-gray-900 text-white p-4 h-48 overflow-y-auto rounded-lg font-mono text-sm shadow-lg">
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
        </div>
      </main>
    </div>
  );
}

export default App;
