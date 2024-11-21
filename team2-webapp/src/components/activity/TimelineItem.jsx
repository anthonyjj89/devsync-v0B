import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../../utils/debug';

const COMPONENT = 'TimelineItem';

const TimelineItem = ({ item, onFileClick }) => {
  const handleFileClick = () => {
    if (item.type === 'file' && item.path) {
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'File clicked', {
        path: item.path,
        aiType: item.aiType
      });
      onFileClick(item.path);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
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

  const renderContent = () => {
    if (item.type === 'chat') {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.role}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getAIBadgeColor(item.aiType)}`}>
              {item.aiType === 'kodu' ? 'Kodu AI' : 'Cline AI'}
            </span>
          </div>
          <div className="text-sm text-gray-600">{item.text}</div>
        </div>
      );
    }

    if (item.type === 'file') {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.tool}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getAIBadgeColor(item.aiType)}`}>
              {item.aiType === 'kodu' ? 'Kodu AI' : 'Cline AI'}
            </span>
          </div>
          {item.path && (
            <button
              onClick={handleFileClick}
              className="text-sm text-left text-blue-600 hover:underline truncate"
            >
              {item.path}
            </button>
          )}
          {item.error && (
            <div className="text-sm text-red-600">{item.error}</div>
          )}
          {item.toolResult && (
            <div className="text-sm text-gray-600">{item.toolResult}</div>
          )}
          {item.status && (
            <div className={`text-sm ${getStatusColor(item.status)}`}>
              Status: {item.status}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex items-start gap-4">
      <div className="flex-1">{renderContent()}</div>
    </div>
  );
};

TimelineItem.propTypes = {
  item: PropTypes.shape({
    type: PropTypes.oneOf(['chat', 'file']).isRequired,
    role: PropTypes.string,
    text: PropTypes.string,
    tool: PropTypes.string,
    path: PropTypes.string,
    status: PropTypes.string,
    error: PropTypes.string,
    toolResult: PropTypes.string,
    aiType: PropTypes.oneOf(['kodu', 'cline']).isRequired
  }).isRequired,
  onFileClick: PropTypes.func
};

export default TimelineItem;
