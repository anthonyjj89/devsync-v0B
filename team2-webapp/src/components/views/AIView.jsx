import PropTypes from 'prop-types';
import MessageList from '../MessageList';
import { debugLogger, DEBUG_LEVELS } from '../../utils/debug';

const COMPONENT = 'AIView';

const AIView = ({
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
  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Rendering AIView', {
    isMonitoring,
    hasError: !!error,
    messagesCount: messages.length,
    advancedMode,
    showDebug
  });

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
            onAdvancedModeChange={onAdvancedModeChange}
            className="h-full"
            onFileClick={onFileClick}
            taskFolder={monitoringConfig.taskFolder}
            onTaskFolderChange={(folder) => onTaskFolderChange({
              ...monitoringConfig,
              koduTaskFolder: folder,
              enabledAIs: { kodu: true, cline: false }
            })}
          />
        </div>
      </div>
    </div>
  );
};

AIView.propTypes = {
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
