import { useMemo } from 'react';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'useTimelineData';

const useTimelineData = (messages = [], aiType) => {
  const timelineItems = useMemo(() => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Processing timeline data', {
      aiType,
      messageCount: messages.length
    });

    // Combine chat messages and file activities into a single chronological timeline
    const items = messages.reduce((acc, message) => {
      // Handle different message formats
      if (message.type === 'say' && message.say === 'text') {
        // Add chat message with AI type
        acc.push({
          text: message.text,
          timestamp: message.ts, // Use ts instead of timestamp
          type: 'chat',
          role: 'assistant',
          aiType,
          metadata: message.metadata || {}
        });
      } else if (message.type === 'ask' && message.ask === 'tool') {
        // Add tool message
        try {
          const toolData = JSON.parse(message.text);
          acc.push({
            timestamp: message.ts,
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
        } catch (error) {
          debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error parsing tool data', {
            error: error.message,
            messageText: message.text
          });
        }
      } else if (message.type === 'chat') {
        // Handle standard chat message format
        acc.push({
          ...message,
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
            timestamp: message.timestamp,
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

    // Sort items chronologically, handling both ts and timestamp properties
    const sortedItems = items.sort((a, b) => {
      const aTime = a.timestamp || a.ts;
      const bTime = b.timestamp || b.ts;
      return aTime - bTime;
    });

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Timeline data processed', {
      aiType,
      messageCount: messages.length,
      timelineItemCount: sortedItems.length,
      firstItemType: sortedItems[0]?.type,
      lastItemType: sortedItems[sortedItems.length - 1]?.type
    });

    return sortedItems;
  }, [messages, aiType]);

  return {
    timelineItems,
    isEmpty: timelineItems.length === 0
  };
};

export default useTimelineData;
