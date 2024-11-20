import PropTypes from 'prop-types';
import { useEffect } from 'react';
import MessageBubble from './MessageBubble';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'MessageList';

const MessageList = ({ messages = [], type }) => {
  useEffect(() => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, `Rendering ${type} messages`, {
      messageCount: messages.length
    });
  }, [messages, type]);

  const processMessage = (message) => {
    if (!message) {
      debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Received null/undefined message', { type });
      return null;
    }

    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Processing message', { 
      type,
      rawMessage: message 
    });

    // Extract message content based on the actual format
    let text = '';
    let timestamp = message.ts || null;
    let messageType = type;
    let isSubMessage = message.isSubMessage || false;
    let isFetching = message.isFetching || false;
    let isError = message.isError || false;
    let errorText = message.errorText || null;

    // Handle different message types
    if (message.text) {
      text = message.text;
    } else if (message.say === 'text') {
      text = message.text;
    } else if (message.say === 'api_req_started') {
      text = 'API Request: ' + message.text;
    } else if (message.say === 'user_feedback') {
      text = 'User: ' + message.text;
    }

    // For API conversation history
    if (message.role === 'user' && Array.isArray(message.content)) {
      text = message.content.map(item => item.text).join('\n');
    } else if (message.role === 'assistant' && Array.isArray(message.content)) {
      text = message.content.map(item => item.text).join('\n');
    }

    const processedMessage = {
      text,
      timestamp,
      type: messageType,
      isSubMessage,
      isFetching,
      isError,
      errorText
    };

    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Processed message', {
      type,
      processedMessage
    });

    return processedMessage;
  };

  return (
    <div className="message-list" style={{
      padding: '20px',
      overflowY: 'auto',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {Array.isArray(messages) && messages.length > 0 ? (
        messages.map((message, index) => {
          const processedMessage = processMessage(message);
          if (!processedMessage || !processedMessage.text) return null;
          
          debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, `Rendering message ${index}`, {
            type,
            messageIndex: index,
            messageType: processedMessage.type
          });

          return (
            <MessageBubble
              key={index}
              {...processedMessage}
            />
          );
        })
      ) : (
        <div style={{ textAlign: 'center', color: '#666' }}>
          {(() => {
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'No messages to display', { type });
            return 'No messages to display';
          })()}
        </div>
      )}
    </div>
  );
};

MessageList.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.shape({
    ts: PropTypes.number,
    type: PropTypes.string,
    say: PropTypes.string,
    text: PropTypes.string,
    role: PropTypes.string,
    content: PropTypes.array,
    isSubMessage: PropTypes.bool,
    isFetching: PropTypes.bool,
    isError: PropTypes.bool,
    errorText: PropTypes.string
  })),
  type: PropTypes.string
};

export default MessageList;
