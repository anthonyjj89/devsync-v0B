import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
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
  system: {
    icon: '⚙️',
    name: 'System'
  }
};

const JsonContent = ({ content }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  return (
    <div className="font-mono text-xs">
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="text-blue-600 hover:text-blue-800 mb-1 flex items-center gap-1"
      >
        <span>{isCollapsed ? '▶' : '▼'}</span>
        <span>{isCollapsed ? 'Show Details' : 'Hide Details'}</span>
      </button>
      {!isCollapsed && (
        <pre className="whitespace-pre-wrap overflow-x-auto">
          {content}
        </pre>
      )}
      {isCollapsed && (
        <div className="text-gray-500 italic">
          Click to view API details
        </div>
      )}
    </div>
  );
};

JsonContent.propTypes = {
  content: PropTypes.string.isRequired
};

const MessageBubble = ({ 
  text, 
  timestamp, 
  role = 'assistant',
  type = 'text',
  showTimestamp = true,
  isError = false,
  errorText = null,
  metadata = {},
  onFileClick
}) => {
  useEffect(() => {
    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Rendering message bubble', {
      role,
      type,
      isError,
      hasTimestamp: !!timestamp,
      textLength: text?.length
    });
  }, [text, timestamp, role, type, isError]);

  const formattedTimestamp = useMemo(() => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error formatting timestamp', {
        timestamp,
        error: error.message
      });
      return '';
    }
  }, [timestamp]);

  const getTypeStyles = () => {
    const baseClasses = [
      'p-3',
      'rounded-lg',
      'max-w-[80%]',
      'break-words',
      'whitespace-pre-wrap',
      'shadow-sm'
    ];

    // Role-based styling
    const isUser = role === 'user';
    if (isUser) {
      baseClasses.push('bg-blue-600', 'text-white', 'ml-auto');
    } else if (role === 'assistant') {
      baseClasses.push('bg-gray-100', 'text-gray-900', 'mr-auto');
    } else {
      baseClasses.push('bg-gray-50', 'text-gray-600', 'mx-auto', 'max-w-full', 'text-sm');
    }

    // Type-specific styling
    switch (type) {
      case 'question':
        if (!isUser) {
          baseClasses.push('bg-blue-50', 'text-blue-900', 'border', 'border-blue-100');
        }
        break;
      case 'thinking':
        baseClasses.push('bg-gray-50', 'text-gray-700', 'italic', 'border', 'border-gray-200', 'max-w-full');
        break;
      case 'api_request':
        baseClasses.push('bg-gray-50', 'border', 'border-gray-200', 'max-w-full');
        if (metadata?.isApiRequest || metadata?.isToolRequest) {
          baseClasses.push('hover:border-blue-300', 'transition-colors');
        }
        break;
      case 'tool_response':
        baseClasses.push('bg-green-50', 'text-green-900', 'border', 'border-green-200');
        break;
      case 'system':
        baseClasses.push('bg-gray-50', 'text-gray-600', 'border', 'border-gray-200');
        break;
    }

    // Error state
    if (isError) {
      baseClasses.push('bg-red-50', 'text-red-900', 'border', 'border-red-200');
    }

    return baseClasses.join(' ');
  };

  const containerClasses = useMemo(() => {
    const isUserMessage = role === 'user';
    const isSystem = role === 'system';
    return `mb-3 ${isUserMessage ? 'text-right' : isSystem ? 'text-center' : 'text-left'}`;
  }, [role]);

  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.assistant;

  const renderTextWithFileLinks = (text) => {
    // Basic regex to match file paths
    const filePathRegex = /([a-zA-Z]:\\[^<>:"/\\|?*\n\r]+|[/\w\-.]+[/\w\-.]+\.[a-zA-Z0-9]+)/g;
    const parts = text.split(filePathRegex);

    return parts.map((part, index) => {
      if (part.match(filePathRegex)) {
        return (
          <button
            key={index}
            onClick={() => onFileClick?.(part, timestamp)}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            {part}
          </button>
        );
      }
      return part;
    });
  };

  const renderContent = () => {
    if (isError && errorText) {
      // Just show the error text without the "Error:" prefix
      return errorText;
    }

    // Handle API requests and JSON content
    if (type === 'api_request' && (metadata?.isApiRequest || metadata?.isToolRequest)) {
      return <JsonContent content={text} />;
    }

    // Handle thinking content
    if (type === 'thinking') {
      return (
        <div className="flex items-center gap-2">
          <span className="animate-pulse">💭</span>
          <span>{text}</span>
        </div>
      );
    }

    return renderTextWithFileLinks(text);
  };

  return (
    <div className={containerClasses}>
      {showTimestamp && timestamp && (
        <div className="text-xs text-gray-500 mb-1">
          {formattedTimestamp}
        </div>
      )}
      <div className="flex items-start gap-2">
        {role !== 'user' && role !== 'system' && (
          <div className="flex items-center gap-1 mt-1" title={role}>
            <span className="text-lg">{roleConfig.icon}</span>
            {roleConfig.name && (
              <span className="text-sm font-medium text-gray-700">{roleConfig.name}</span>
            )}
          </div>
        )}
        <div className={getTypeStyles()}>
          {renderContent()}
        </div>
        {role === 'user' && (
          <div className="flex items-center gap-1 mt-1" title={role}>
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
  role: PropTypes.oneOf(['user', 'assistant', 'system']),
  type: PropTypes.oneOf(['text', 'thinking', 'question', 'api_request', 'tool_response', 'system']),
  showTimestamp: PropTypes.bool,
  isError: PropTypes.bool,
  errorText: PropTypes.string,
  metadata: PropTypes.object,
  onFileClick: PropTypes.func
};

export default MessageBubble;
