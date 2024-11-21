import { useMemo } from 'react';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'useTimelineData';

// Cache for parsed tool data
const toolDataCache = new Map();

const parseToolData = (messageText) => {
  const cacheKey = messageText;
  if (toolDataCache.has(cacheKey)) {
    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Tool data found in cache');
    return toolDataCache.get(cacheKey);
  }

  try {
    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Parsing tool data', { messageText });
    const toolData = JSON.parse(messageText);
    toolDataCache.set(cacheKey, toolData);

    // Keep cache size manageable
    if (toolDataCache.size > 1000) {
      const oldestKey = toolDataCache.keys().next().value;
      toolDataCache.delete(oldestKey);
    }

    return toolData;
  } catch (error) {
    debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Failed to parse tool data', {
      error: error.message,
      messageText
    });
    return null;
  }
};

const validateMessage = (message) => {
  if (!message) {
    debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Invalid message: null or undefined');
    return false;
  }

  if (typeof message !== 'object') {
    debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Invalid message: not an object', {
      type: typeof message
    });
    return false;
  }

  // Check for required timestamp
  if (!message.ts && !message.timestamp) {
    debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Invalid message: missing timestamp', {
      message
    });
    return false;
  }

  return true;
};

const useTimelineData = (messages = [], aiType) => {
  const timelineItems = useMemo(() => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Processing timeline data', {
      aiType,
      messageCount: messages.length
    });

    if (!Array.isArray(messages)) {
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Invalid messages prop', {
        type: typeof messages
      });
      return [];
    }

    // Combine chat messages and file activities into a single chronological timeline
    const items = messages.reduce((acc, message, index) => {
      if (!validateMessage(message)) {
        return acc;
      }

      // Normalize timestamp
      const timestamp = message.ts || message.timestamp;

      debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Processing message', {
        index,
        type: message.type,
        say: message.say,
        timestamp
      });

      // Handle different message formats
      if (message.type === 'say' && message.say === 'text') {
        debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Processing text message', {
          text: message.text?.substring(0, 100) // Log first 100 chars
        });
        
        // Add chat message with AI type
        acc.push({
          text: message.text,
          timestamp,
          type: 'chat',
          role: 'assistant',
          aiType,
          metadata: message.metadata || {}
        });
      } else if (message.type === 'ask' && message.ask === 'tool') {
        debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Processing tool message');
        
        // Add tool message
        const toolData = parseToolData(message.text);
        if (toolData) {
          debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Tool data parsed successfully', {
            tool: toolData.tool,
            path: toolData.path
          });
          
          acc.push({
            timestamp,
            type: 'file',
            tool: toolData.tool,
            path: toolData.path,
            status: toolData.approvalState || 'unknown',
            error: toolData.error,
            toolResult: toolData.result,
            approvalState: toolData.approvalState,
            toolStatus: toolData.status,
            aiType
          });
        }
      } else if (message.type === 'chat') {
        debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Processing chat message', {
          role: message.role
        });
        
        // Handle standard chat message format
        acc.push({
          ...message,
          timestamp,
          type: 'chat',
          aiType
        });

        // Add file activity if present
        const metadata = message.metadata || {};
        const toolInfo = metadata.toolInfo || {};
        if (
          toolInfo.tool === 'read_file' ||
          toolInfo.tool === 'write_to_file' ||
          toolInfo.tool === 'list_files' ||
          toolInfo.tool === 'saveClaudeMessages'
        ) {
          debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Adding file activity', {
            tool: toolInfo.tool,
            path: toolInfo.path || toolInfo.filePath
          });
          
          acc.push({
            timestamp,
            type: 'file',
            tool: toolInfo.tool,
            path: toolInfo.path || toolInfo.filePath,
            status: toolInfo.toolStatus || 'unknown',
            error: toolInfo.error,
            toolResult: toolInfo.toolResult,
            approvalState: toolInfo.approvalState,
            toolStatus: toolInfo.toolStatus,
            aiType
          });
        }
      } else {
        debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Unhandled message type', {
          type: message.type,
          say: message.say
        });
      }

      return acc;
    }, []);

    // Sort items chronologically using normalized timestamp
    const sortedItems = items.sort((a, b) => a.timestamp - b.timestamp);

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Timeline processing complete', {
      inputCount: messages.length,
      outputCount: sortedItems.length
    });

    return sortedItems;
  }, [messages, aiType]);

  const isEmpty = timelineItems.length === 0;
  if (isEmpty && messages.length > 0) {
    debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'No timeline items generated from messages', {
      messageCount: messages.length
    });
  }

  return {
    timelineItems,
    isEmpty
  };
};

export default useTimelineData;
