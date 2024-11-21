import { useState } from 'react';
import PropTypes from 'prop-types';
import MessageList from '../MessageList';
import AISettings from '../ai/AISettings';
import { debugLogger, DEBUG_LEVELS } from '../../utils/debug';

const COMPONENT = 'AIView';

const AIView = ({
  aiType,
  isMonitoring,
  lastUpdated,
  error,
  messages,
  advancedMode,
  onAdvancedModeChange,
  showDebug,
  onFileClick,
  monitoringConfig,
  onTaskFolderChange
}) => {
  const [showSettings, setShowSettings] = useState(false);

  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Rendering AIView', {
    aiType,
    isMonitoring,
    hasError: !!error,
    messagesCount: messages.length,
    advancedMode,
    showDebug,
    showSettings
  });

  const handleSettingsSave = async (config) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'AI settings saved', {
      aiType,
      config
    });
    onTaskFolderChange({
      ...monitoringConfig,
      [`${aiType}TaskFolder`]: config.taskFolder,
      enabledAIs: {
        kodu: aiType === 'kodu',
        cline: aiType === 'cline'
      }
    });
    setShowSettings(false);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="font-medium">
                  {isMonitoring ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                {showSettings ? 'Hide Settings' : 'Show Settings'}
              </button>
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

        {showSettings ? (
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto">
              <AISettings aiType={aiType} onSave={handleSettingsSave} />
            </div>
          </div>
        ) : (
          <div className={`flex-1 p-5 min-h-0 ${showDebug ? 'pb-72' : 'pb-20'}`}>
            <MessageList 
              messages={messages}
              advancedMode={advancedMode}
              onAdvancedModeChange={onAdvancedModeChange}
              className="h-full"
              onFileClick={onFileClick}
              taskFolder={monitoringConfig.taskFolder}
              onTaskFolderChange={(folder) => onTaskFolderChange({
                ...monitoringConfig,
                [`${aiType}TaskFolder`]: folder,
                enabledAIs: {
                  kodu: aiType === 'kodu',
                  cline: aiType === 'cline'
                }
              })}
            />
          </div>
        )}
      </div>
    </div>
  );
};

AIView.propTypes = {
  aiType: PropTypes.oneOf(['kodu', 'cline']).isRequired,
  isMonitoring: PropTypes.bool.isRequired,
  lastUpdated: PropTypes.instanceOf(Date),
  error: PropTypes.string,
  messages: PropTypes.array.isRequired,
  advancedMode: PropTypes.bool.isRequired,
  onAdvancedModeChange: PropTypes.func.isRequired,
  showDebug: PropTypes.bool.isRequired,
  onFileClick: PropTypes.func.isRequired,
  monitoringConfig: PropTypes.shape({
    taskFolder: PropTypes.string,
    basePath: PropTypes.string,
    projectPath: PropTypes.string
  }).isRequired,
  onTaskFolderChange: PropTypes.func.isRequired
};

export default AIView;
