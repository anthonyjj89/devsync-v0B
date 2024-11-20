import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'MessageList';

const cleanText = (text) => {
  if (!text) return null;
  
  // Remove JSON structures
  if (text.startsWith("{") && text.endsWith("}")) return null;

  // Remove tool-related or thinking tags
  return text
    .replace(/<[^>]+>/g, "") // Remove all XML-like tags
    .replace(/\{[^}]+\}/g, "") // Remove JSON objects
    .trim();
};

const groupMessages = (messages) => {
  const grouped = [];
  let lastRole = null;

  messages.forEach((msg) => {
    if (msg.role !== lastRole) {
      grouped.push({ ...msg, showTimestamp: true });
      lastRole = msg.role;
    } else {
      grouped.push({ ...msg, showTimestamp: false });
    }
  });

  return grouped;
};

const MessageList = ({ messages = [] }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Rendering messages', {
      messageCount: messages.length
    });
  }, [messages]);

  const processMessage = (message) => {
    if (!message) {
      debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Received null/undefined message');
      return null;
    }

    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Processing message', { 
      rawMessage: message 
    });

    // Extract core message properties
    const role = message.role || 'user';
    let text = '';
    const timestamp = message.ts || Date.now();

    // Handle different content formats
    if (Array.isArray(message.content)) {
      text = message.content.map(item => cleanText(item.text)).filter(Boolean).join('\n');
    } else if (typeof message.content === 'string') {
      text = cleanText(message.content);
    } else if (message.text) {
      text = cleanText(message.text);
    }

    if (!text) {
      debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Skipping empty or invalid message');
      return null;
    }

    const processedMessage = {
      text,
      timestamp,
      role
    };

    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Processed message', {
      processedMessage
    });

    return processedMessage;
  };

  const processedMessages = messages
    .map(processMessage)
    .filter(Boolean);

  const groupedMessages = groupMessages(processedMessages);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {groupedMessages.length > 0 ? (
          groupedMessages.map((message, index) => {
            debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, `Rendering message ${index}`, {
              messageIndex: index,
              role: message.role
            });

            return (
              <MessageBubble
                key={index}
                {...message}
                showTimestamp={message.showTimestamp}
              />
            );
          })
        ) : (
          <div className="text-center text-gray-500">
            No messages to display
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

MessageList.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.shape({
    role: PropTypes.string,
    content: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.shape({
        text: PropTypes.string
      }))
    ]),
    text: PropTypes.string,
    ts: PropTypes.number
  }))
};

export default MessageList;
