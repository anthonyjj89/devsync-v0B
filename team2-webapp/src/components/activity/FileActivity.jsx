import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../../utils/debug';

const COMPONENT = 'FileActivity';

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

  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Rendering file activity', {
    type: activity.tool,
    status: activity.status,
    aiType: activity.aiType
  });

  return (
    <div className={`pl-4 border-l-2 ${getActivityColor(activity.status)}`}>
      <div className="flex items-start gap-2">
        <span className="text-xl">{getActivityIcon(activity.tool)}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">
              {getActivityTitle(activity.tool)}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getAIBadgeColor(activity.aiType)}`}>
              {activity.aiType === 'kodu' ? 'Kodu AI' : 'Cline AI'}
            </span>
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
    toolStatus: PropTypes.string,
    aiType: PropTypes.oneOf(['kodu', 'cline']).isRequired
  }).isRequired
};

export default FileActivity;
