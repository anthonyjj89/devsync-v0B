import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../../utils/debug';
import MessageBubble from '../MessageBubble';
import FileActivity from './FileActivity';

const COMPONENT = 'TimelineItem';

const TimelineItem = ({ item, onFileClick }) => {
  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Rendering timeline item', {
    type: item.type,
    timestamp: item.timestamp
  });

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
    timestamp: PropTypes.number.isRequired,
    // Chat message props
    role: PropTypes.string,
    text: PropTypes.string,
    isError: PropTypes.bool,
    errorText: PropTypes.string,
    metadata: PropTypes.object,
    // File activity props
    tool: PropTypes.string,
    path: PropTypes.string,
    status: PropTypes.string,
    error: PropTypes.string,
    toolResult: PropTypes.string,
    approvalState: PropTypes.string,
    toolStatus: PropTypes.string
  }).isRequired,
  onFileClick: PropTypes.func
};

export default TimelineItem;
