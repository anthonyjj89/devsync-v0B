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
  errorText = null,
  messageType = 'text'
}) => {
  useEffect(() => {
    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Rendering message bubble', {
      role,
      isError,
      hasTimestamp: !!timestamp,
      textLength: text?.length,
      messageType
    });
  }, [text, timestamp, role, isError, messageType]);

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

  const getMessageTypeStyle = (text, type) => {
    if (text?.startsWith('Tool:')) {
      return 'bg-purple-100 text-purple-900 border border-purple-200';
    }
    
    switch (type) {
      case 'system':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'error':
        return 'bg-red-100 text-red-900 border-2 border-red-300';
      case 'json':
        return 'bg-blue-50 text-blue-900 border border-blue-200 font-mono text-sm';
      default:
        return '';
    }
  };

  const bubbleClasses = useMemo(() => {
    const baseClasses = [
      'p-3',
      'rounded-lg',
      'max-w-[80%]',
      'break-words',
      'whitespace-pre-wrap',
      'shadow-sm'
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

    // Message type styling
    const typeStyle = getMessageTypeStyle(text, messageType);
    if (typeStyle) {
      baseClasses.push(typeStyle);
    }

    // Error state
    if (isError) {
      baseClasses.push('bg-red-100', 'text-red-900', 'border-2', 'border-red-300');
    }

    return baseClasses.join(' ');
  }, [role, isError, text, messageType]);

  const containerClasses = useMemo(() => {
    const isUserMessage = role === 'user';
    return `mb-3 ${isUserMessage ? 'text-right' : 'text-left'}`;
  }, [role]);

  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.user;

  const renderContent = () => {
    if (isError && errorText) {
      return (
        <>
          <div className="text-red-600 font-medium mb-1">
            Error: {errorText}
          </div>
          {text && <div>{text}</div>}
        </>
      );
    }

    if (messageType === 'json') {
      try {
        const formattedJson = JSON.stringify(JSON.parse(text), null, 2);
        return <pre className="overflow-x-auto">{formattedJson}</pre>;
      } catch {
        return text;
      }
    }

    return text;
  };

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
          {renderContent()}
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
  errorText: PropTypes.string,
  messageType: PropTypes.oneOf(['text', 'system', 'error', 'json'])
};

export default MessageBubble;
