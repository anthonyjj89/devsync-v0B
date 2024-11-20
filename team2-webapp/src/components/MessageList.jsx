import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
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

const TimelineItem = ({ item }) => {
  return (
    <div className="mb-6 last:mb-0 flex items-start">
      {/* Left side - Chat message */}
      <div className="flex-1">
        {item.type === 'chat' && (
          <MessageBubble {...item} showTimestamp={false} />
        )}
      </div>

      {/* Middle - Timestamp */}
      <div className="w-24 text-center text-xs text-gray-500 px-2 flex-shrink-0">
        {new Date(item.timestamp).toLocaleTimeString()}
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
  }).isRequired
};

const MessageList = ({ messages = [], advancedMode = false, className = '' }) => {
  const messagesEndRef = useRef(null);

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
        tool: toolInfo.tool, // Pass the tool type directly
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
        <h2 className="font-bold text-lg">Activity Timeline</h2>
      </div>
      <div className="h-full overflow-y-auto synchronized-scroll">
        <div className="px-4 py-6 space-y-4">
          {timelineItems.length > 0 ? (
            timelineItems.map((item, index) => (
              <TimelineItem
                key={`${item.timestamp}-${index}`}
                item={item}
              />
            ))
          ) : (
            <div className="text-center text-gray-500">
              No activity to display
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
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
  className: PropTypes.string
};

export default MessageList;
