import { useState } from 'react';
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
    error: watcherError
  } = useFileWatcher();

  const {
    showDebug,
    debugLogs,
    toggleDebug
  } = useDebugLogs();

  const handleFileClick = (filePath, version) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'File clicked', {
      filePath,
      version
    });
    setSelectedFile(filePath);
    setSelectedVersion(version);
    setActiveTab('files');
  };

  const renderContent = () => {
    const error = pathError || watcherError;

    switch (activeTab) {
      case 'kodu':
      case 'cline':
        if (!isPathConfigured(activeTab)) {
          return (
            <ConfigurationRequired
              aiType={activeTab}
              onShowDebug={toggleDebug}
            />
          );
        }

        return (
          <AIView
            isMonitoring={isMonitoring}
            lastUpdated={lastUpdated}
            error={error}
            messages={messages}
            advancedMode={advancedMode}
            onAdvancedModeChange={setAdvancedMode}
            showDebug={showDebug}
            onFileClick={handleFileClick}
            monitoringConfig={monitoringConfig}
            onTaskFolderChange={handlePathsUpdate}
          />
        );
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
    monitoringConfig,
    advancedMode
  });

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar 
        activeTab={activeTab}
        onTabChange={tab => {
          setActiveTab(tab);
        }}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
        <DebugPanel
          show={showDebug}
          onToggle={toggleDebug}
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
