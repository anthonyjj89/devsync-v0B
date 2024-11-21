import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';
import TimelineItem from './activity/TimelineItem';
import TaskFolderSelect from './TaskFolderSelect';
import ChatSettings from './ChatSettings';
import useTimelineData from '../hooks/useTimelineData';
import useMessageSettings from '../hooks/useMessageSettings';

const COMPONENT = 'MessageList';

const MessageList = ({
  messages = [],
  className = '',
  onFileClick,
  taskFolder,
  onTaskFolderChange,
  onAdvancedModeChange
}) => {
  const messagesEndRef = useRef(null);
  const { timelineItems, isEmpty } = useTimelineData(messages);
  const {
    showSettings,
    advancedMode,
    handleSettingsSave,
    toggleSettings,
    toggleAdvancedMode
  } = useMessageSettings({
    taskFolder,
    onTaskFolderChange
  });

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

  // Sync advanced mode with parent component
  useEffect(() => {
    onAdvancedModeChange(advancedMode);
  }, [advancedMode, onAdvancedModeChange]);

  return (
    <div className={`bg-white shadow-lg rounded-lg overflow-hidden ${className}`}>
      <div className="p-4 bg-gray-50 border-b sticky top-0 z-50">
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
                  onChange={(e) => toggleAdvancedMode(e.target.checked)}
                  className="sr-only"
                />
                <div className={`block w-10 h-6 rounded-full transition-colors duration-200 ease-in-out ${advancedMode ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${advancedMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
            </label>
            <button
              onClick={toggleSettings}
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
      <div className="h-full overflow-y-auto">
        <div className="px-4 py-6 relative">
          {/* Continuous vertical timeline line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-blue-200 transform -translate-x-1/2" />
          
          {!isEmpty ? (
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
        onClose={toggleSettings}
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
  className: PropTypes.string,
  onFileClick: PropTypes.func,
  taskFolder: PropTypes.string,
  onTaskFolderChange: PropTypes.func,
  onAdvancedModeChange: PropTypes.func
};

export default MessageList;
