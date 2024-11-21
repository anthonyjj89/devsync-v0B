import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import TaskFolderSelect from './TaskFolderSelect';
import ChatSettings from './ChatSettings';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'MessageList';

const FileActivity = ({ activity }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'read_file':
        return '📖';
      case 'write_to_file':
        return '✍️';
      case 'list_files':
        return '📁';
      case 'saveClaudeMessages':
        return '💾';
      default:
        return '📄';
    }
  };

  const getActivityColor = (status) => {
    switch (status) {
      case 'success':
        return 'border-green-500';
      case 'error':
        return 'border-red-500';
      default:
        return 'border-gray-300';
    }
  };

  const getActivityTitle = (type) => {
    switch (type) {
      case 'read_file':
        return 'Reading File';
      case 'write_to_file':
        return 'Writing File';
      case 'list_files':
        return 'Listing Files';
      case 'saveClaudeMessages':
        return 'Saving Messages';
      default:
        return 'File Activity';
    }
  };

  return (
    <div className={`pl-4 border-l-2 ${getActivityColor(activity.status)}`}>
      <div className="flex items-start gap-2">
        <span className="text-xl">{getActivityIcon(activity.tool)}</span>
        <div className="flex-1">
          <div className="text-sm font-medium">
            {getActivityTitle(activity.tool)}
          </div>
          {activity.path && (
            <div className="text-xs text-gray-600 break-all">
              {activity.path}
            </div>
          )}
          {activity.error && (
            <div className="text-xs text-red-500 mt-1">
              {activity.error}
            </div>
          )}
          {activity.toolResult && (
            <div className="text-xs text-gray-600 mt-1">
              {activity.toolResult}
            </div>
          )}
          {activity.approvalState && (
            <div className="text-xs text-green-600 mt-1">
              Status: {activity.approvalState}
            </div>
          )}
          {activity.toolStatus && activity.toolStatus !== 'unknown' && (
            <div className={`text-xs mt-1 ${activity.toolStatus === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              Status: {activity.toolStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

FileActivity.propTypes = {
  activity: PropTypes.shape({
    tool: PropTypes.string.isRequired,
    path: PropTypes.string,
    status: PropTypes.string,
    error: PropTypes.string,
    toolResult: PropTypes.string,
    approvalState: PropTypes.string,
    toolStatus: PropTypes.string
  }).isRequired
};

const TimelineItem = ({ item, onFileClick }) => {
  return (
    <div className="mb-6 last:mb-0 flex items-start">
      {/* Left side - Chat message */}
      <div className="flex-1">
        {item.type === 'chat' && (
          <MessageBubble {...item} showTimestamp={false} onFileClick={onFileClick} />
        )}
      </div>

      {/* Middle - Timeline dot and timestamp */}
      <div className="w-24 flex-shrink-0 flex flex-col items-center">
        <div className="w-3 h-3 bg-blue-500 rounded-full relative z-10" />
        <div className="mt-1 px-2 text-xs text-gray-500 bg-white relative z-10">
          {new Date(item.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {/* Right side - File activity */}
      <div className="flex-1">
        {item.type === 'file' && (
          <FileActivity activity={item} />
        )}
      </div>
    </div>
  );
};

TimelineItem.propTypes = {
  item: PropTypes.shape({
    type: PropTypes.oneOf(['chat', 'file']).isRequired,
    timestamp: PropTypes.number.isRequired
  }).isRequired,
  onFileClick: PropTypes.func
};

const MessageList = ({ messages = [], advancedMode = false, className = '', onFileClick, taskFolder, onTaskFolderChange, onAdvancedModeChange }) => {
  const messagesEndRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Rendering messages', {
      messageCount: messages.length,
      advancedMode
    });
  }, [messages, advancedMode]);

  const handleSettingsSave = (config) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Settings updated', config);
    if (config.koduTaskFolder !== taskFolder) {
      onTaskFolderChange(config.koduTaskFolder);
    }
  };

  // Combine chat messages and file activities into a single chronological timeline
  const timelineItems = messages.reduce((acc, message) => {
    // Add chat message
    acc.push({
      ...message,
      type: 'chat'
    });

    // Add file activity if present
    const metadata = message.metadata || {};
    const toolInfo = metadata.toolInfo || {};
    if (
      toolInfo.tool === 'read_file' ||
      toolInfo.tool === 'write_to_file' ||
      toolInfo.tool === 'list_files' ||
      toolInfo.tool === 'saveClaudeMessages'
    ) {
      acc.push({
        timestamp: message.timestamp,
        type: 'file',
        tool: toolInfo.tool,
        path: toolInfo.path || toolInfo.filePath,
        status: toolInfo.toolStatus || 'unknown',
        error: toolInfo.error,
        toolResult: toolInfo.toolResult,
        approvalState: toolInfo.approvalState,
        toolStatus: toolInfo.toolStatus
      });
    }

    return acc;
  }, []).sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className={`bg-white shadow-lg rounded-lg overflow-hidden ${className}`}>
      <div className="p-4 bg-gray-50 border-b">
        <div className="flex items-center justify-between mb-2">
          <TaskFolderSelect 
            currentFolder={taskFolder}
            onSelect={onTaskFolderChange}
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <span className="text-gray-700">Advanced Mode</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={advancedMode}
                  onChange={(e) => onAdvancedModeChange(e.target.checked)}
                  className="sr-only"
                />
                <div className={`block w-10 h-6 rounded-full transition-colors duration-200 ease-in-out ${advancedMode ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${advancedMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
            </label>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-full hover:bg-gray-100"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
        <h2 className="font-bold text-lg">Activity Timeline</h2>
      </div>
      <div className="h-full overflow-y-auto synchronized-scroll">
        <div className="px-4 py-6 relative">
          {/* Continuous vertical timeline line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-blue-200 transform -translate-x-1/2" />
          
          {timelineItems.length > 0 ? (
            <div className="space-y-6 relative">
              {timelineItems.map((item, index) => (
                <TimelineItem
                  key={`${item.timestamp}-${index}`}
                  item={item}
                  onFileClick={onFileClick}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500">
              No activity to display
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSettingsSave}
      />
    </div>
  );
};

MessageList.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.shape({
    role: PropTypes.string,
    text: PropTypes.string,
    timestamp: PropTypes.number,
    isError: PropTypes.bool,
    errorText: PropTypes.string,
    type: PropTypes.string,
    metadata: PropTypes.object
  })),
  advancedMode: PropTypes.bool,
  className: PropTypes.string,
  onFileClick: PropTypes.func,
  taskFolder: PropTypes.string,
  onTaskFolderChange: PropTypes.func,
  onAdvancedModeChange: PropTypes.func
};

export default MessageList;
