import PropTypes from 'prop-types';
import { useEffect } from 'react';
import MessageList from '../MessageList';
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
  useEffect(() => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'AIView mounted/updated', {
      aiType,
      isMonitoring,
      hasError: !!error,
      messagesCount: messages?.length || 0,
      taskFolder: monitoringConfig?.taskFolder,
      lastUpdated: lastUpdated?.toISOString()
    });

    // Log message details if there are messages
    if (messages?.length > 0) {
      debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Message details', {
        firstMessage: {
          type: messages[0].type,
          timestamp: messages[0].timestamp,
          role: messages[0].role
        },
        lastMessage: {
          type: messages[messages.length - 1].type,
          timestamp: messages[messages.length - 1].timestamp,
          role: messages[messages.length - 1].role
        }
      });
    }

    // Log monitoring config details
    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Monitoring config', {
      taskFolder: monitoringConfig?.taskFolder,
      basePath: monitoringConfig?.basePath,
      projectPath: monitoringConfig?.projectPath
    });
  }, [aiType, isMonitoring, error, messages, monitoringConfig, lastUpdated]);

  // Validate messages array
  if (!Array.isArray(messages)) {
    debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Invalid messages prop', {
      type: typeof messages,
      value: messages
    });
    return (
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 bg-red-100 text-red-700">
            Error: Invalid messages format
          </div>
        </div>
      </div>
    );
  }

  const handleTaskFolderChange = (folder) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Task folder change requested', {
      aiType,
      currentFolder: monitoringConfig?.taskFolder,
      newFolder: folder
    });

    onTaskFolderChange({
      ...monitoringConfig,
      [`${aiType}TaskFolder`]: folder,
      enabledAIs: {
        kodu: aiType === 'kodu',
        cline: aiType === 'cline'
      }
    });
  };

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
            aiType={aiType}
            messages={messages}
            advancedMode={advancedMode}
            onAdvancedModeChange={onAdvancedModeChange}
            className="h-full"
            onFileClick={onFileClick}
            taskFolder={monitoringConfig?.taskFolder}
            onTaskFolderChange={handleTaskFolderChange}
          />
        </div>
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
