import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const FileActivityTimeline = ({ messages, className = '' }) => {
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
          };
          acc.push(activity);
        }
        
        return acc;
      }, []).sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp to match chat order
    };

    setActivities(extractFileActivities(messages));
  }, [messages]);

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

  return (
    <div className={`w-80 bg-white shadow-lg rounded-lg overflow-hidden ${className}`}>
      <div className="p-4 bg-gray-50 border-b">
        <h2 className="font-bold text-lg">File Activity</h2>
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
                <div className={`flex-1 pl-4 border-l-2 ${getActivityColor(activity.status)}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{getActivityIcon(activity.type)}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {activity.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
                    </div>
                  </div>
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
  messages: PropTypes.arrayOf(PropTypes.shape({
    timestamp: PropTypes.number,
    metadata: PropTypes.shape({
      toolInfo: PropTypes.shape({
        tool: PropTypes.string,
        path: PropTypes.string,
        filePath: PropTypes.string,
        toolStatus: PropTypes.string,
        error: PropTypes.string
      })
    })
  })).isRequired,
  className: PropTypes.string
};

export default FileActivityTimeline;
