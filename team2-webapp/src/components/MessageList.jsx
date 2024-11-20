import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';
import { processMessageContent, groupMessages, shouldShowTimestamp } from '../utils/messageProcessor';

const COMPONENT = 'MessageList';

const MessageGroup = ({ group }) => {
  return (
    <div className="mb-6 last:mb-0">
      {group.messages.map((message, index) => (
        <MessageBubble
          key={`${group.id}-${index}`}
          {...message}
          showTimestamp={shouldShowTimestamp(message, index, group.messages)}
        />
      ))}
    </div>
  );
};

MessageGroup.propTypes = {
  group: PropTypes.shape({
    id: PropTypes.number.isRequired,
    messages: PropTypes.arrayOf(PropTypes.shape({
      role: PropTypes.string,
      text: PropTypes.string,
      timestamp: PropTypes.number,
      type: PropTypes.string,
      metadata: PropTypes.object
    })),
    timestamp: PropTypes.number
  }).isRequired
};

const MessageList = ({ messages = [] }) => {
  const messagesEndRef = useRef(null);
  const [advancedMode, setAdvancedMode] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Rendering messages', {
      messageCount: messages.length,
      advancedMode
    });
  }, [messages, advancedMode]);

  const processMessage = (message) => {
    if (!message) {
      debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Received null/undefined message');
      return null;
    }

    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Processing message', { 
      rawMessage: message,
      advancedMode
    });

    // Process the message content
    const text = message.text;
    if (!text) {
      debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Skipping empty or invalid message');
      return null;
    }

    const processedContent = processMessageContent(text, advancedMode);
    if (!processedContent) return null;

    // Determine the role based on message type and content
    let role = message.role || 'assistant';
    
    // Override role if the processed content indicates it's a user message
    if (processedContent.role === 'user' || 
        (message.type === 'say' && message.say === 'user_feedback')) {
      role = 'user';
    }

    const processedMessage = {
      text: processedContent.content,
      timestamp: message.timestamp || Date.now(),
      role,
      type: processedContent.type,
      metadata: processedContent.metadata,
      isError: message.isError || false,
      errorText: message.errorText
    };

    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Processed message', {
      processedMessage
    });

    return processedMessage;
  };

  const processedMessages = messages
    .map(processMessage)
    .filter(Boolean);

  const messageGroups = groupMessages(processedMessages);

  return (
    <div className="h-full flex flex-col">
      {/* Header with Advanced Mode Toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Messages</h2>
          <span className="text-sm text-gray-500">({messages.length})</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Advanced</span>
            <button
              onClick={() => setAdvancedMode(!advancedMode)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                advancedMode ? 'bg-blue-600' : 'bg-gray-200'
              }`}
              title="Toggle advanced mode"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  advancedMode ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-6 space-y-4">
        {messageGroups.length > 0 ? (
          messageGroups.map((group) => (
            <MessageGroup
              key={group.id}
              group={group}
            />
          ))
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
    text: PropTypes.string,
    rawContent: PropTypes.string,
    timestamp: PropTypes.number,
    isError: PropTypes.bool,
    errorText: PropTypes.string,
    type: PropTypes.string,
    say: PropTypes.string
  }))
};

export default MessageList;
