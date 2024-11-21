import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import AIView from './components/views/AIView';
import ConfigurationRequired from './components/views/ConfigurationRequired';
import DevManagerDashboard from './components/DevManagerDashboard';
import ProjectOwnerDashboard from './components/ProjectOwnerDashboard';
import FileExplorer from './components/FileExplorer';
import DebugPanel from './components/debug/DebugPanel';
import { FileWatcherProvider, useFileWatcher } from './contexts/FileWatcherContext';
import usePathConfig from './hooks/usePathConfig';
import useDebugLogs from './hooks/useDebugLogs';
import { debugLogger, DEBUG_LEVELS } from './utils/debug';

const COMPONENT = 'App';

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('kodu');
  const [advancedMode, setAdvancedMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState('latest');

  const {
    monitoringConfig,
    error: pathError,
    handlePathsUpdate,
    isPathConfigured
  } = usePathConfig();

  const {
    fileWatcher,
    isMonitoring,
    lastUpdated,
    messages,
    error: watcherError,
    activeAI,
    setActiveAI,
    initializeWatcher
  } = useFileWatcher();

  const {
    showDebug,
    debugLogs,
    toggleDebug,
    clearLogs
  } = useDebugLogs();

  // Initialize watcher when configuration changes
  useEffect(() => {
    const initializeActiveAI = async () => {
      if (activeAI === 'kodu' && monitoringConfig.koduTaskFolder) {
        const config = {
          basePath: monitoringConfig.koduPath,
          taskFolder: monitoringConfig.koduTaskFolder,
          projectPath: monitoringConfig.projectPath
        };
        await initializeWatcher(config, 'kodu');
      } else if (activeAI === 'cline' && monitoringConfig.clineTaskFolder) {
        const config = {
          basePath: monitoringConfig.clinePath,
          taskFolder: monitoringConfig.clineTaskFolder,
          projectPath: monitoringConfig.projectPath
        };
        await initializeWatcher(config, 'cline');
      }
    };

    initializeActiveAI();
  }, [activeAI, monitoringConfig, initializeWatcher]);

  const handleFileClick = (filePath, version) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'File clicked', {
      filePath,
      version
    });
    setSelectedFile(filePath);
    setSelectedVersion(version);
    setActiveTab('files');
  };

  const handleTabChange = (tab) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Tab changed', {
      from: activeTab,
      to: tab
    });
    
    setActiveTab(tab);
    // Update active AI when switching between AI tabs
    if (tab === 'kodu' || tab === 'cline') {
      setActiveAI(tab);
    }
  };

  const renderAIView = (aiType) => {
    if (!isPathConfigured(aiType)) {
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Path not configured', { aiType });
      return (
        <ConfigurationRequired
          aiType={aiType}
          onShowDebug={toggleDebug}
        />
      );
    }

    const error = pathError || watcherError;
    const aiConfig = {
      ...monitoringConfig,
      taskFolder: monitoringConfig[`${aiType}TaskFolder`] || '',
      basePath: monitoringConfig[`${aiType}Path`] || ''
    };

    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Rendering AI view', {
      aiType,
      hasError: !!error,
      config: aiConfig
    });

    return (
      <AIView
        aiType={aiType}
        isMonitoring={isMonitoring}
        lastUpdated={lastUpdated}
        error={error}
        messages={messages}
        advancedMode={advancedMode}
        onAdvancedModeChange={setAdvancedMode}
        showDebug={showDebug}
        onFileClick={handleFileClick}
        monitoringConfig={aiConfig}
        onTaskFolderChange={handlePathsUpdate}
      />
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'kodu':
      case 'cline':
        return renderAIView(activeTab);
      
      case 'dev-manager':
        return <DevManagerDashboard messages={messages} />;
      
      case 'project-manager':
        return <ProjectOwnerDashboard messages={messages} />;
      
      case 'files':
        if (!isPathConfigured(activeTab)) {
          return (
            <ConfigurationRequired
              aiType="files"
              onShowDebug={toggleDebug}
            />
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
    hasError: !!(pathError || watcherError),
    messagesCount: messages.length,
    debugLogsCount: debugLogs.length,
    activeTab,
    activeAI,
    monitoringConfig,
    advancedMode
  });

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar 
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {renderContent()}
        <DebugPanel
          show={showDebug}
          onToggle={toggleDebug}
          onClear={clearLogs}
          debugLogs={debugLogs}
        />
      </main>
    </div>
  );
};

const App = () => {
  return (
    <FileWatcherProvider>
      <AppContent />
    </FileWatcherProvider>
  );
};

export default App;
