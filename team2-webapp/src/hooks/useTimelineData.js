import { useMemo } from 'react';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'useTimelineData';

// Cache for parsed tool data
const toolDataCache = new Map();

const parseToolData = (messageText) => {
  const cacheKey = messageText;
  if (toolDataCache.has(cacheKey)) {
    return toolDataCache.get(cacheKey);
  }

  try {
    const toolData = JSON.parse(messageText);
    toolDataCache.set(cacheKey, toolData);

    // Keep cache size manageable
    if (toolDataCache.size > 1000) {
      const oldestKey = toolDataCache.keys().next().value;
      toolDataCache.delete(oldestKey);
    }

    return toolData;
  } catch (error) {
    return null;
  }
};

const useTimelineData = (messages = [], aiType) => {
  const timelineItems = useMemo(() => {
    // Only log when there are messages to process
    if (messages.length > 0) {
      debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Processing timeline data', {
        aiType,
        messageCount: messages.length
      });
    }

    // Combine chat messages and file activities into a single chronological timeline
    const items = messages.reduce((acc, message) => {
      // Normalize timestamp
      const timestamp = message.ts || message.timestamp;

      // Handle different message formats
      if (message.type === 'say' && message.say === 'text') {
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
        // Add tool message
        const toolData = parseToolData(message.text);
        if (toolData) {
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
      }

      return acc;
    }, []);

    // Sort items chronologically using normalized timestamp
    return items.sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, aiType]);

  return {
    timelineItems,
    isEmpty: timelineItems.length === 0
  };
};

export default useTimelineData;
