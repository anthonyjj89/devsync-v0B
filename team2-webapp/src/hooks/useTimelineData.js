import { useMemo } from 'react';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'useTimelineData';

const useTimelineData = (messages = []) => {
  const timelineItems = useMemo(() => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Processing timeline data', {
      messageCount: messages.length
    });

    // Combine chat messages and file activities into a single chronological timeline
    const items = messages.reduce((acc, message) => {
      // Add chat message
      acc.push({
        ...message,
        type: 'chat'
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
          toolStatus: toolInfo.toolStatus
        });
      }

      return acc;
    }, []);

    // Sort items chronologically
    const sortedItems = items.sort((a, b) => a.timestamp - b.timestamp);

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Timeline data processed', {
      messageCount: messages.length,
      timelineItemCount: sortedItems.length
    });

    return sortedItems;
  }, [messages]);

  return {
    timelineItems,
    isEmpty: timelineItems.length === 0
  };
};

export default useTimelineData;
