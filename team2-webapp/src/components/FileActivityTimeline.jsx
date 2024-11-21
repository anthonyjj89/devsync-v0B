import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';
import FileActivity from './activity/FileActivity';

const COMPONENT = 'FileActivityTimeline';

const FileActivityTimeline = ({ aiType, messages, className = '' }) => {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const extractFileActivities = (msgs) => {
      return msgs.reduce((acc, message) => {
        const metadata = message.metadata || {};
        const toolInfo = metadata.toolInfo || {};
        
        // Check for file-related activities
        if (
          toolInfo.tool === 'read_file' ||
          toolInfo.tool === 'write_to_file' ||
          toolInfo.tool === 'list_files' ||
          toolInfo.tool === 'saveClaudeMessages'
        ) {
          const activity = {
            timestamp: message.timestamp,
            type: toolInfo.tool,
            path: toolInfo.path || toolInfo.filePath,
            status: toolInfo.toolStatus || 'unknown',
            error: toolInfo.error,
            toolResult: toolInfo.toolResult,
            approvalState: toolInfo.approvalState,
            toolStatus: toolInfo.toolStatus,
            aiType // Include AI type in activity data
          };
          acc.push(activity);
        }
        
        return acc;
      }, []).sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp to match chat order
    };

    const processedActivities = extractFileActivities(messages);
    setActivities(processedActivities);

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Activities processed', {
      aiType,
      messageCount: messages.length,
      activityCount: processedActivities.length
    });
  }, [messages, aiType]);

  const getAIBadgeColor = (aiType) => {
    switch (aiType) {
      case 'kodu':
        return 'bg-blue-100 text-blue-800';
      case 'cline':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`w-80 bg-white shadow-lg rounded-lg overflow-hidden ${className}`}>
      <div className="p-4 bg-gray-50 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-lg">File Activity</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full ${getAIBadgeColor(aiType)}`}>
            {aiType === 'kodu' ? 'Kodu AI' : 'Cline AI'}
          </span>
        </div>
      </div>
      <div className="h-full overflow-y-auto synchronized-scroll">
        <div className="p-4">
          {activities.length === 0 ? (
            <div className="text-gray-500 text-center">
              No file activities recorded yet
            </div>
          ) : (
            activities.map((activity, index) => (
              <div
                key={`${activity.timestamp}-${index}`}
                className="flex items-start mb-6 last:mb-0"
              >
                <div className="w-24 text-center text-xs text-gray-500 px-2">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </div>
                <div className="flex-1">
                  <FileActivity activity={activity} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

FileActivityTimeline.propTypes = {
  aiType: PropTypes.oneOf(['kodu', 'cline']).isRequired,
  messages: PropTypes.arrayOf(PropTypes.shape({
    timestamp: PropTypes.number,
    metadata: PropTypes.shape({
      toolInfo: PropTypes.shape({
        tool: PropTypes.string,
        path: PropTypes.string,
        filePath: PropTypes.string,
        toolStatus: PropTypes.string,
        error: PropTypes.string,
        toolResult: PropTypes.string,
        approvalState: PropTypes.string
      })
    })
  })).isRequired,
  className: PropTypes.string
};

export default FileActivityTimeline;
