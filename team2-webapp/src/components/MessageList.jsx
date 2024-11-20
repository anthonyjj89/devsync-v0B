import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';
import { groupMessages, shouldShowTimestamp } from '../utils/messageProcessor';

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

const MessageList = ({ messages = [], advancedMode = false, className = '' }) => {
  const messagesEndRef = useRef(null);

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

  const messageGroups = groupMessages(messages);

  return (
    <div className={`bg-white shadow-lg rounded-lg overflow-hidden ${className}`}>
      <div className="p-4 bg-gray-50 border-b">
        <h2 className="font-bold text-lg">Chat Messages</h2>
      </div>
      <div className="h-full overflow-y-auto">
        <div className="px-4 py-6 space-y-4">
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
    </div>
  );
};

MessageList.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.shape({
    role: PropTypes.string,
    text: PropTypes.string,
    timestamp: PropTypes.number,
    isError: PropTypes.bool,
    errorText: PropTypes.string,
    type: PropTypes.string,
    metadata: PropTypes.object
  })),
  advancedMode: PropTypes.bool,
  className: PropTypes.string
};

export default MessageList;
