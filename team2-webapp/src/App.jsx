import { useState, useEffect, useCallback } from 'react';
import FileWatcher from './services/fileWatcher';
import MessageList from './components/MessageList';
import DevManagerDashboard from './components/DevManagerDashboard';
import ProjectOwnerDashboard from './components/ProjectOwnerDashboard';
import Sidebar from './components/Sidebar';
import FileExplorer from './components/FileExplorer';
import { debugLogger, DEBUG_LEVELS } from './utils/debug';
import { processMessageContent } from './utils/messageProcessor';
import './App.css';

const COMPONENT = 'App';

function App() {
  const [messages, setMessages] = useState([]);
  const [fileWatcher, setFileWatcher] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [monitoringConfig, setMonitoringConfig] = useState(() => {
    const koduPath = localStorage.getItem('koduAI.path');
    const koduTaskFolder = localStorage.getItem('koduAI.taskFolder');
    return {
      basePath: koduPath || '',
      taskFolder: koduTaskFolder || '',
      projectPath: localStorage.getItem('project.path') || ''
    };
  });
  const [error, setError] = useState('');
  const [showDebug, setShowDebug] = useState(true);
  const [debugLogs, setDebugLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('kodu');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState('latest');

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

  const createFileWatcher = useCallback(() => {
    return new FileWatcher((type, data) => {
      const updateId = `update-${type}-${Date.now()}`;
      debugLogger.startTimer(updateId);

      try {
        addDebugLog(`Received ${type} messages update`, data);
        setLastUpdated(new Date());
        
        const processedData = data?.map(msg => {
          const processedContent = processMessageContent(msg, advancedMode);
          if (!processedContent) return null;

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
              processedRole: processedContent.role
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
  }, [addDebugLog, advancedMode]);

  useEffect(() => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Initializing App');

    const watcher = createFileWatcher();

    // Set project path if available
    if (monitoringConfig.projectPath) {
      watcher.setProjectPath(monitoringConfig.projectPath);
    }

    setFileWatcher(watcher);
    if (monitoringConfig.basePath && monitoringConfig.taskFolder) {
      initializeWatcher(watcher, monitoringConfig);
    }

    return () => {
      if (watcher) {
        watcher.stop();
      }
    };
  }, [createFileWatcher]);

  const initializeWatcher = async (watcher, config) => {
    try {
      if (!config.basePath || !config.taskFolder) {
        throw new Error('No monitoring path configured');
      }

      addDebugLog('Starting monitoring with config:', config);
      await watcher.setBasePath(config.basePath, config.taskFolder).validatePath();
      
      // Set project path if available
      if (config.projectPath) {
        watcher.setProjectPath(config.projectPath);
      }
      
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

  const handlePathsUpdate = async (newConfig) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Configuration updated', {
      oldConfig: monitoringConfig,
      newConfig
    });

    // Determine which AI to use based on enabled state and path changes
    let basePath = '';
    let taskFolder = '';
    let aiType = '';

    if (newConfig.enabledAIs.kodu && newConfig.koduPath && newConfig.koduTaskFolder) {
      const koduPathChanged = newConfig.koduPath !== localStorage.getItem('koduAI.path') ||
                             newConfig.koduTaskFolder !== localStorage.getItem('koduAI.taskFolder');
      
      if (!newConfig.enabledAIs.cline || koduPathChanged) {
        basePath = newConfig.koduPath;
        taskFolder = newConfig.koduTaskFolder;
        aiType = 'kodu';
      }
    }

    if (newConfig.enabledAIs.cline && newConfig.clinePath && newConfig.clineTaskFolder && !basePath) {
      basePath = newConfig.clinePath;
      taskFolder = newConfig.clineTaskFolder;
      aiType = 'cline';
    }

    if (!basePath || !taskFolder) {
      setError('No valid AI configuration found. Please enable and configure at least one AI.');
      return;
    }

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Selected AI configuration', {
      aiType,
      basePath,
      taskFolder
    });

    // Stop the current watcher
    if (fileWatcher) {
      fileWatcher.stop();
      setMessages([]);
      setError('');
    }

    // Create new watcher and set project path immediately
    const newWatcher = createFileWatcher();
    if (newConfig.projectPath) {
      newWatcher.setProjectPath(newConfig.projectPath);
    }
    
    // Set the watcher first so components can use it
    setFileWatcher(newWatcher);

    // Update monitoring config
    const updatedConfig = {
      basePath,
      taskFolder,
      projectPath: newConfig.projectPath
    };
    setMonitoringConfig(updatedConfig);

    // Initialize the watcher
    try {
      await initializeWatcher(newWatcher, updatedConfig);
      // Switch to the active AI tab
      setActiveTab(aiType);
    } catch (err) {
      setError(`Failed to initialize new watcher: ${err.message}`);
    }
  };

  const handleFileClick = (filePath, version) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'File clicked', {
      filePath,
      version
    });
    setSelectedFile(filePath);
    setSelectedVersion(version);
    setActiveTab('files');
  };

  const isPathConfigured = () => {
    if (activeTab === 'kodu') {
      const koduPath = localStorage.getItem('koduAI.path');
      const koduTaskFolder = localStorage.getItem('koduAI.taskFolder');
      return !!koduPath && !!koduTaskFolder;
    } else if (activeTab === 'cline') {
      const clinePath = localStorage.getItem('clineAI.path');
      const clineTaskFolder = localStorage.getItem('clineAI.taskFolder');
      return !!clinePath && !!clineTaskFolder;
    } else if (activeTab === 'files') {
      return !!monitoringConfig.projectPath;
    }
    return true;
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
                  onClick={() => setShowDebug(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Show Debug Panel
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="flex-1 flex overflow-hidden">
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
                </div>
                {error && (
                  <div className="mt-2 text-center p-2 bg-red-100 text-red-700 rounded">
                    {error}
                  </div>
                )}
              </div>
              <div className={`flex-1 p-5 min-h-0 ${showDebug ? 'pb-72' : 'pb-20'}`}>
                <MessageList 
                  messages={messages}
                  advancedMode={advancedMode}
                  onAdvancedModeChange={setAdvancedMode}
                  className="h-full"
                  onFileClick={handleFileClick}
                  taskFolder={monitoringConfig.taskFolder}
                  onTaskFolderChange={(folder) => handlePathsUpdate({
                    ...monitoringConfig,
                    koduTaskFolder: folder,
                    enabledAIs: { kodu: true, cline: false }
                  })}
                />
              </div>
            </div>
          </div>
        );
      case 'dev-manager':
        return <DevManagerDashboard messages={messages} />;
      case 'project-manager':
        return <ProjectOwnerDashboard messages={messages} />;
      case 'files':
        if (!isPathConfigured()) {
          return (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-8 bg-white rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4">Configuration Required</h2>
                <p className="text-gray-600 mb-4">
                  Please configure a project path in settings.
                </p>
                <button
                  onClick={() => setShowDebug(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Show Debug Panel
                </button>
              </div>
            </div>
          );
        }
        return (
          <FileExplorer 
            fileWatcher={fileWatcher} 
            initialFile={selectedFile}
            initialVersion={selectedVersion}
          />
        );
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
