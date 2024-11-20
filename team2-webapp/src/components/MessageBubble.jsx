import PropTypes from 'prop-types';
import { useEffect, useMemo } from 'react';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'MessageBubble';

const MessageBubble = ({ 
  text, 
  timestamp, 
  type = 'default',
  isSubMessage = false,
  isFetching = false,
  isError = false,
  errorText = null
}) => {
  useEffect(() => {
    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Rendering message bubble', {
      type,
      isSubMessage,
      isFetching,
      isError,
      hasTimestamp: !!timestamp,
      textLength: text?.length
    });
  }, [text, timestamp, type, isSubMessage, isFetching, isError]);

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
      'px-4 py-3',
      'rounded-lg',
      'max-w-[80%]',
      'break-words',
      'whitespace-pre-wrap',
      'font-mono',
      'text-sm',
      'shadow-sm'
    ];

    // Alignment and colors based on message type
    if (type === 'claude') {
      baseClasses.push('self-start', 'bg-assistant', 'text-gray-800');
    } else {
      baseClasses.push('self-end', 'bg-user', 'text-white');
    }

    // Sub-message styling
    if (isSubMessage) {
      baseClasses.push('ml-5', 'text-xs', 'opacity-80');
    }

    // Loading state
    if (isFetching) {
      baseClasses.push('opacity-70');
    }

    // Error state
    if (isError) {
      baseClasses.push('border-2', 'border-error');
    }

    return baseClasses.join(' ');
  }, [type, isSubMessage, isFetching, isError]);

  const renderContent = () => {
    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Rendering content', {
      hasText: !!text,
      hasError: isError,
      hasErrorText: !!errorText
    });

    if (isError && errorText) {
      return (
        <>
          <div className="text-error mb-1">
            Error: {errorText}
          </div>
          {text && <div>{text}</div>}
        </>
      );
    }

    if (isFetching) {
      return (
        <>
          <div className="mb-1">Loading...</div>
          {text && <div className="opacity-70">{text}</div>}
        </>
      );
    }

    return text || '';
  };

  return (
    <div className="mb-3">
      {timestamp && (
        <div className={`
          text-xs 
          text-gray-500 
          mb-1
          ${type === 'claude' ? 'text-left' : 'text-right'}
        `}>
          {formattedTimestamp}
        </div>
      )}
      <div className={bubbleClasses}>
        {renderContent()}
      </div>
    </div>
  );
};

MessageBubble.propTypes = {
  text: PropTypes.string,
  timestamp: PropTypes.number,
  type: PropTypes.string,
  isSubMessage: PropTypes.bool,
  isFetching: PropTypes.bool,
  isError: PropTypes.bool,
  errorText: PropTypes.string
};

export default MessageBubble;
