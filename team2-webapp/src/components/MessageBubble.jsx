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

  const bubbleStyle = useMemo(() => {
    const style = {
      padding: '10px 15px',
      borderRadius: '10px',
      maxWidth: '80%',
      wordBreak: 'break-word',
      whiteSpace: 'pre-wrap',
      fontFamily: 'monospace',
      fontSize: '14px',
      alignSelf: type === 'claude' ? 'flex-start' : 'flex-end',
      backgroundColor: type === 'claude' ? '#f0f0f0' : '#007bff',
      color: type === 'claude' ? '#000' : '#fff',
      opacity: isFetching ? 0.7 : 1,
      border: isError ? '2px solid #dc3545' : 'none'
    };

    if (isSubMessage) {
      style.marginLeft = '20px';
      style.fontSize = '12px';
      style.opacity = 0.8;
    }

    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Computed bubble style', {
      type,
      isSubMessage,
      isFetching,
      isError,
      style
    });

    return style;
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
          <div style={{ color: '#dc3545', marginBottom: '5px' }}>
            Error: {errorText}
          </div>
          {text && <div>{text}</div>}
        </>
      );
    }

    if (isFetching) {
      return (
        <>
          <div style={{ marginBottom: '5px' }}>Loading...</div>
          {text && <div style={{ opacity: 0.7 }}>{text}</div>}
        </>
      );
    }

    return text || '';
  };

  return (
    <div style={{ marginBottom: '10px' }}>
      {timestamp && (
        <div style={{
          fontSize: '10px',
          color: '#666',
          marginBottom: '2px',
          textAlign: type === 'claude' ? 'left' : 'right'
        }}>
          {formattedTimestamp}
        </div>
      )}
      <div style={bubbleStyle}>
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
