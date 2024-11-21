import { debugLogger, DEBUG_LEVELS } from './debug';

const COMPONENT = 'MessageProcessor';

// Cache for processed messages
const processedCache = new Map();

/**
 * Formats JSON content for display with memoization
 */
const formatJsonContent = (() => {
  const cache = new Map();
  
  return (jsonStr) => {
    const cacheKey = typeof jsonStr === 'string' ? jsonStr : JSON.stringify(jsonStr);
    
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    try {
      const obj = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
      const result = JSON.stringify(obj, null, 2);
      cache.set(cacheKey, result);
      return result;
    } catch (e) {
      return jsonStr;
    }
  };
})();

/**
 * Extracts content from XML-style tags with memoization
 */
const extractTagContent = (() => {
  const cache = new Map();
  
  return (text, tagName) => {
    const cacheKey = `${text}-${tagName}`;
    
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 's');
    const match = text.match(regex);
    const result = match ? match[1].trim() : null;
    
    cache.set(cacheKey, result);
    return result;
  };
})();

/**
 * Extracts tool information from message content with memoization
 */
const extractToolInfo = (() => {
  const cache = new Map();
  
  return (text) => {
    if (cache.has(text)) {
      return cache.get(text);
    }

    const toolTags = ['read_file', 'write_to_file', 'list_files', 'search_files', 'saveClaudeMessages'];
    let toolInfo = null;

    for (const tag of toolTags) {
      const toolContent = extractTagContent(text, tag);
      if (toolContent) {
        toolInfo = {
          tool: tag,
          path: extractTagContent(toolContent, 'path'),
          filePath: extractTagContent(toolContent, 'filePath'),
          content: extractTagContent(toolContent, 'content'),
        };
        break;
      }
    }

    // Extract tool response information if present
    const toolResponse = extractTagContent(text, 'toolResponse');
    if (toolResponse) {
      toolInfo = {
        ...toolInfo,
        toolStatus: extractTagContent(toolResponse, 'toolStatus'),
        error: extractTagContent(toolResponse, 'error')
      };
    }

    cache.set(text, toolInfo);
    return toolInfo;
  };
})();

/**
 * Determines the role of a message based on its content and type
 */
const determineMessageRole = (message) => {
  if (message.role) {
    return message.role;
  }

  if (Array.isArray(message.content)) {
    for (const item of message.content) {
      if (item.type === 'text' && item.text?.includes('user_feedback')) {
        return 'user';
      }
    }
  }

  if (typeof message.content === 'string' && message.content.includes('user_feedback')) {
    return 'user';
  }

  if (message.type === 'say' && message.say === 'user_feedback') {
    return 'user';
  }

  return 'assistant';
};

/**
 * Processes JSON content based on message type with optimizations
 */
const processJsonContent = (jsonContent, advancedMode = false) => {
  try {
    const cacheKey = JSON.stringify({ content: jsonContent, mode: advancedMode });
    if (processedCache.has(cacheKey)) {
      return processedCache.get(cacheKey);
    }

    if (!advancedMode && jsonContent.isError && jsonContent.errorText) {
      const result = {
        type: 'text',
        content: jsonContent.errorText,
        metadata: { original: jsonContent, isError: true },
        role: 'system'
      };
      processedCache.set(cacheKey, result);
      return result;
    }

    if (Array.isArray(jsonContent.content)) {
      const textContent = jsonContent.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');

      const toolInfo = extractToolInfo(textContent);
      const result = {
        type: 'text',
        content: textContent,
        metadata: { 
          original: jsonContent,
          toolInfo 
        },
        role: determineMessageRole(jsonContent)
      };
      processedCache.set(cacheKey, result);
      return result;
    }

    if (jsonContent.type === 'say' && jsonContent.say === 'user_feedback') {
      const result = {
        type: 'text',
        content: jsonContent.text,
        metadata: { isUserFeedback: true },
        role: 'user'
      };
      processedCache.set(cacheKey, result);
      return result;
    }

    if (jsonContent.type === 'ask' && jsonContent.ask === 'tool') {
      try {
        const toolData = JSON.parse(jsonContent.text);
        if (toolData.tool === 'ask_followup_question') {
          const result = {
            type: 'question',
            content: toolData.question,
            metadata: { tool: 'ask_followup_question' },
            role: 'assistant'
          };
          processedCache.set(cacheKey, result);
          return result;
        }
        
        const toolInfo = {
          tool: toolData.tool,
          path: toolData.path,
          filePath: toolData.filePath,
          content: toolData.content
        };

        if (advancedMode) {
          const result = {
            type: 'api_request',
            content: formatJsonContent(toolData),
            metadata: { 
              tool: toolData.tool,
              isToolRequest: true,
              toolInfo
            },
            role: 'system'
          };
          processedCache.set(cacheKey, result);
          return result;
        }

        const result = {
          type: 'text',
          content: '',
          metadata: { toolInfo },
          role: 'system'
        };
        processedCache.set(cacheKey, result);
        return result;
      } catch (e) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error parsing tool message', {
          error: e.message,
          text: jsonContent.text
        });
      }
    }

    if (jsonContent.type === 'say' && 
        jsonContent.say === 'text' && 
        jsonContent.text?.includes('<thinking>')) {
      const thinkingContent = extractTagContent(jsonContent.text, 'thinking');
      const toolInfo = extractToolInfo(jsonContent.text);
      if (thinkingContent) {
        const result = {
          type: 'thinking',
          content: thinkingContent,
          metadata: { 
            original: jsonContent.text,
            toolInfo
          },
          role: 'assistant'
        };
        processedCache.set(cacheKey, result);
        return result;
      }
    }

    if (!advancedMode) {
      if (jsonContent.type === 'say' && jsonContent.say === 'text') {
        const role = determineMessageRole(jsonContent);
        const toolInfo = extractToolInfo(jsonContent.text);
        const thinkingContent = extractTagContent(jsonContent.text, 'thinking');
        
        const result = {
          type: thinkingContent ? 'thinking' : 'text',
          content: thinkingContent || jsonContent.text,
          metadata: { 
            original: jsonContent,
            toolInfo
          },
          role
        };
        processedCache.set(cacheKey, result);
        return result;
      }
      return null;
    }

    if (jsonContent.type === 'say' && jsonContent.say === 'api_req_started') {
      const requestData = JSON.parse(jsonContent.text);
      const result = {
        type: 'api_request',
        content: formatJsonContent(requestData),
        metadata: {
          request: requestData,
          isApiRequest: true
        },
        role: 'system'
      };
      processedCache.set(cacheKey, result);
      return result;
    }

    if (jsonContent.text) {
      const role = determineMessageRole(jsonContent);
      const toolInfo = extractToolInfo(jsonContent.text);
      const result = {
        type: 'system',
        content: jsonContent.text,
        metadata: { 
          raw: jsonContent,
          toolInfo
        },
        role
      };
      processedCache.set(cacheKey, result);
      return result;
    }

    return null;
  } catch (error) {
    debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error processing JSON content', {
      error: error.message,
      jsonContent
    });
    return null;
  }
};

/**
 * Cleans and processes message text with optimizations
 */
export const processMessageContent = (message, advancedMode = false) => {
  if (!message) return null;

  const cacheKey = JSON.stringify({ message, mode: advancedMode });
  if (processedCache.has(cacheKey)) {
    return processedCache.get(cacheKey);
  }

  try {
    if (!advancedMode && message.isError && message.errorText) {
      const result = {
        type: 'text',
        content: message.errorText,
        metadata: { original: message, isError: true },
        role: 'system'
      };
      processedCache.set(cacheKey, result);
      return result;
    }

    if (message.content && Array.isArray(message.content)) {
      const textContent = message.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');

      const toolInfo = extractToolInfo(textContent);
      const thinkingContent = extractTagContent(textContent, 'thinking');

      const result = {
        type: thinkingContent ? 'thinking' : 'text',
        content: thinkingContent || textContent,
        metadata: { 
          original: message,
          toolInfo
        },
        role: determineMessageRole(message)
      };
      processedCache.set(cacheKey, result);
      return result;
    }

    if (typeof message === 'string') {
      try {
        const jsonContent = JSON.parse(message);
        return processJsonContent(jsonContent, advancedMode);
      } catch {
        // Not JSON, continue with text processing
      }
    }

    if (typeof message === 'object') {
      return processJsonContent(message, advancedMode);
    }

    const text = String(message);
    if (!text.trim()) return null;

    const toolInfo = extractToolInfo(text);
    const thinkingContent = extractTagContent(text, 'thinking');

    if (!advancedMode) {
      const cleanedText = text
        .replace(/<environment_details>.*?<\/environment_details>/s, '')
        .replace(/<most_important_context>.*?<\/most_important_context>/s, '')
        .replace(/<task>.*?<\/task>/s, '')
        .replace(/<toolResponse>.*?<\/toolResponse>/s, '')
        .trim();

      if (cleanedText) {
        const result = {
          type: thinkingContent ? 'thinking' : 'text',
          content: thinkingContent || cleanedText,
          metadata: { 
            original: text,
            toolInfo
          },
          role: text.includes('user_feedback') ? 'user' : 'assistant'
        };
        processedCache.set(cacheKey, result);
        return result;
      }
      return null;
    }

    if (thinkingContent) {
      const result = {
        type: 'thinking',
        content: thinkingContent,
        metadata: { 
          original: text,
          toolInfo
        },
        role: 'assistant'
      };
      processedCache.set(cacheKey, result);
      return result;
    }

    const toolResponse = extractTagContent(text, 'toolResponse');
    if (toolResponse) {
      const result = {
        type: 'tool_response',
        content: extractTagContent(toolResponse, 'toolResult') || toolResponse,
        metadata: {
          status: extractTagContent(toolResponse, 'toolStatus'),
          name: extractTagContent(toolResponse, 'toolName'),
          toolInfo
        },
        role: 'system'
      };
      processedCache.set(cacheKey, result);
      return result;
    }

    const cleanedText = text
      .replace(/<environment_details>.*?<\/environment_details>/s, '')
      .replace(/<most_important_context>.*?<\/most_important_context>/s, '')
      .replace(/<task>.*?<\/task>/s, '')
      .trim();

    if (cleanedText) {
      const role = text.includes('user_feedback') ? 'user' : 'assistant';
      const result = {
        type: 'text',
        content: cleanedText,
        metadata: { 
          original: text,
          toolInfo
        },
        role
      };
      processedCache.set(cacheKey, result);
      return result;
    }

    return null;
  } catch (error) {
    debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error processing message content', {
      error: error.message,
      message
    });
    return null;
  }
};

// Clear cache periodically to prevent memory leaks
setInterval(() => {
  processedCache.clear();
}, 5 * 60 * 1000); // Clear every 5 minutes

/**
 * Groups related messages together
 */
export const groupMessages = (messages) => {
  const grouped = [];
  let currentGroup = null;

  messages.forEach((msg) => {
    if (!currentGroup || msg.role === 'user') {
      if (currentGroup) {
        grouped.push(currentGroup);
      }
      currentGroup = {
        id: Date.now() + Math.random(),
        messages: [msg],
        timestamp: msg.timestamp
      };
    } else {
      currentGroup.messages.push(msg);
    }
  });

  if (currentGroup) {
    grouped.push(currentGroup);
  }

  return grouped;
};

/**
 * Determines if a message should show its timestamp
 */
export const shouldShowTimestamp = (message, index, messages) => {
  if (index === 0) return true;
  const prevMessage = messages[index - 1];
  
  return (
    message.role !== prevMessage.role ||
    !prevMessage.timestamp ||
    !message.timestamp ||
    Math.abs(message.timestamp - prevMessage.timestamp) > 5 * 60 * 1000
  );
};
