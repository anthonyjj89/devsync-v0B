import PropTypes from 'prop-types';
import { useEffect, useMemo } from 'react';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'MessageBubble';

// Role-specific icons and names
const ROLE_CONFIG = {
  user: {
    icon: '👤',
    name: 'Kodu User'
  },
  assistant: {
    icon: '🤖',
    name: 'Kodu'
  },
  'dev manager': {
    icon: '👨‍💻',
    name: null
  }
};

const MessageBubble = ({ 
  text, 
  timestamp, 
  role = 'user',
  showTimestamp = true,
  isError = false,
  errorText = null
}) => {
  useEffect(() => {
    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Rendering message bubble', {
      role,
      isError,
      hasTimestamp: !!timestamp,
      textLength: text?.length
    });
  }, [text, timestamp, role, isError]);

  const formattedTimestamp = useMemo(() => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const formatted = date.toLocaleString();
      debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Formatted timestamp', {
        raw: timestamp,
        formatted
      });
      return formatted;
    } catch (error) {
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error formatting timestamp', {
        timestamp,
        error: error.message
      });
      return '';
    }
  }, [timestamp]);

  const bubbleClasses = useMemo(() => {
    const baseClasses = [
      'p-2',
      'rounded-lg',
      'max-w-[80%]',
      'break-words',
      'whitespace-pre-wrap'
    ];

    // Role-based styling
    switch (role) {
      case 'assistant':
        baseClasses.push('bg-gray-200', 'text-gray-900');
        break;
      case 'dev manager':
        baseClasses.push('bg-blue-100', 'text-blue-900');
        break;
      case 'user':
      default:
        baseClasses.push('bg-blue-100', 'text-blue-900');
    }

    // Error state
    if (isError) {
      baseClasses.push('bg-red-100', 'text-red-900', 'border', 'border-red-300');
    }

    return baseClasses.join(' ');
  }, [role, isError]);

  const containerClasses = useMemo(() => {
    const isUserMessage = role === 'user';
    return `mb-3 ${isUserMessage ? 'text-right' : 'text-left'}`;
  }, [role]);

  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.user;

  return (
    <div className={containerClasses}>
      {showTimestamp && timestamp && (
        <div className="text-xs text-gray-500 mb-1">
          {formattedTimestamp}
        </div>
      )}
      <div className="flex items-start gap-2">
        {role !== 'user' && (
          <div className="flex items-center gap-1" title={role}>
            <span className="text-lg">{roleConfig.icon}</span>
            {roleConfig.name && (
              <span className="text-sm font-medium text-gray-700">{roleConfig.name}</span>
            )}
          </div>
        )}
        <div className={bubbleClasses}>
          {isError && errorText ? (
            <>
              <div className="text-red-600 mb-1">
                Error: {errorText}
              </div>
              {text && <div>{text}</div>}
            </>
          ) : (
            text
          )}
        </div>
        {role === 'user' && (
          <div className="flex items-center gap-1" title={role}>
            {roleConfig.name && (
              <span className="text-sm font-medium text-gray-700">{roleConfig.name}</span>
            )}
            <span className="text-lg">{roleConfig.icon}</span>
          </div>
        )}
      </div>
    </div>
  );
};

MessageBubble.propTypes = {
  text: PropTypes.string.isRequired,
  timestamp: PropTypes.number,
  role: PropTypes.oneOf(['user', 'assistant', 'dev manager']),
  showTimestamp: PropTypes.bool,
  isError: PropTypes.bool,
  errorText: PropTypes.string
};

export default MessageBubble;
