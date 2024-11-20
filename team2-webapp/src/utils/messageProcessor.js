import { debugLogger, DEBUG_LEVELS } from './debug';

const COMPONENT = 'MessageProcessor';

/**
 * Formats JSON content for display
 */
const formatJsonContent = (jsonStr) => {
  try {
    const obj = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return jsonStr;
  }
};

/**
 * Extracts content from XML-style tags
 */
const extractTagContent = (text, tagName) => {
  const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 's');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
};

/**
 * Extracts tool information from message content
 */
const extractToolInfo = (text) => {
  const toolTags = ['read_file', 'write_to_file', 'list_files', 'search_files', 'saveClaudeMessages'];
  let toolInfo = null;

  for (const tag of toolTags) {
    const toolContent = extractTagContent(text, tag);
    if (toolContent) {
      toolInfo = {
        tool: tag,
        path: extractTagContent(toolContent, 'path'),
        filePath: extractTagContent(toolContent, 'filePath'), // Some messages use filePath instead of path
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

  return toolInfo;
};

/**
 * Determines the role of a message based on its content and type
 */
const determineMessageRole = (message) => {
  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Determining message role', message);

  // Use explicit role if present
  if (message.role) {
    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Using explicit role', { role: message.role });
    return message.role;
  }

  // Handle array content
  if (Array.isArray(message.content)) {
    for (const item of message.content) {
      if (item.type === 'text' && item.text) {
        if (item.text.includes('user_feedback')) {
          return 'user';
        }
      }
    }
  }

  // Handle string content
  if (typeof message.content === 'string' && message.content.includes('user_feedback')) {
    return 'user';
  }

  // Handle legacy format
  if (message.type === 'say' && message.say === 'user_feedback') {
    return 'user';
  }

  return 'assistant'; // Default role
};

/**
 * Processes JSON content based on message type
 */
const processJsonContent = (jsonContent, advancedMode = false) => {
  try {
    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Processing JSON content', {
      content: jsonContent,
      advancedMode
    });

    // Handle error messages in basic mode
    if (!advancedMode && jsonContent.isError && jsonContent.errorText) {
      return {
        type: 'text',
        content: jsonContent.errorText,
        metadata: { original: jsonContent, isError: true },
        role: 'system'
      };
    }

    // Handle array content
    if (Array.isArray(jsonContent.content)) {
      const textContent = jsonContent.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');

      const toolInfo = extractToolInfo(textContent);

      return {
        type: 'text',
        content: textContent,
        metadata: { 
          original: jsonContent,
          toolInfo 
        },
        role: determineMessageRole(jsonContent)
      };
    }

    // Handle user feedback - always show in both modes
    if (jsonContent.type === 'say' && jsonContent.say === 'user_feedback') {
      debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Processing user feedback message');
      return {
        type: 'text',
        content: jsonContent.text,
        metadata: { isUserFeedback: true },
        role: 'user'
      };
    }

    // Handle AI tool messages
    if (jsonContent.type === 'ask' && jsonContent.ask === 'tool') {
      try {
        const toolData = JSON.parse(jsonContent.text);
        if (toolData.tool === 'ask_followup_question') {
          return {
            type: 'question',
            content: toolData.question,
            metadata: { tool: 'ask_followup_question' },
            role: 'assistant'
          };
        }
        
        // Always include tool info in metadata, regardless of mode
        const toolInfo = {
          tool: toolData.tool,
          path: toolData.path,
          filePath: toolData.filePath,
          content: toolData.content
        };

        // In advanced mode, show the full tool request
        if (advancedMode) {
          return {
            type: 'api_request',
            content: formatJsonContent(toolData),
            metadata: { 
              tool: toolData.tool,
              isToolRequest: true,
              toolInfo
            },
            role: 'system'
          };
        }

        // In basic mode, just include the tool info in metadata
        return {
          type: 'text',
          content: '',
          metadata: { toolInfo },
          role: 'system'
        };
      } catch (e) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error parsing tool message', {
          error: e.message,
          text: jsonContent.text
        });
      }
    }

    // Handle thinking messages in both modes
    if (jsonContent.type === 'say' && 
        jsonContent.say === 'text' && 
        jsonContent.text?.includes('<thinking>')) {
      const thinkingContent = extractTagContent(jsonContent.text, 'thinking');
      const toolInfo = extractToolInfo(jsonContent.text);
      if (thinkingContent) {
        return {
          type: 'thinking',
          content: thinkingContent,
          metadata: { 
            original: jsonContent.text,
            toolInfo
          },
          role: 'assistant'
        };
      }
    }

    // In basic mode, show direct AI/user communication and thinking messages
    if (!advancedMode) {
      if (jsonContent.type === 'say' && jsonContent.say === 'text') {
        const role = determineMessageRole(jsonContent);
        const toolInfo = extractToolInfo(jsonContent.text);
        const thinkingContent = extractTagContent(jsonContent.text, 'thinking');
        
        debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Basic mode message processed', { role });

        return {
          type: thinkingContent ? 'thinking' : 'text',
          content: thinkingContent || jsonContent.text,
          metadata: { 
            original: jsonContent,
            toolInfo
          },
          role
        };
      }
      return null;
    }

    // Advanced mode: Handle API requests with formatted JSON
    if (jsonContent.type === 'say' && jsonContent.say === 'api_req_started') {
      const requestData = JSON.parse(jsonContent.text);
      return {
        type: 'api_request',
        content: formatJsonContent(requestData),
        metadata: {
          request: requestData,
          isApiRequest: true
        },
        role: 'system'
      };
    }

    // Advanced mode: Handle other messages
    if (jsonContent.text) {
      const role = determineMessageRole(jsonContent);
      const toolInfo = extractToolInfo(jsonContent.text);
      debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Advanced mode message processed', { role });
      return {
        type: 'system',
        content: jsonContent.text,
        metadata: { 
          raw: jsonContent,
          toolInfo
        },
        role
      };
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
 * Cleans and processes message text
 */
export const processMessageContent = (message, advancedMode = false) => {
  if (!message) return null;

  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Processing message content', {
    message,
    advancedMode
  });

  try {
    // Handle error messages in basic mode
    if (!advancedMode && message.isError && message.errorText) {
      return {
        type: 'text',
        content: message.errorText,
        metadata: { original: message, isError: true },
        role: 'system'
      };
    }

    // Handle message object with content array
    if (message.content && Array.isArray(message.content)) {
      const textContent = message.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');

      const toolInfo = extractToolInfo(textContent);
      const thinkingContent = extractTagContent(textContent, 'thinking');

      return {
        type: thinkingContent ? 'thinking' : 'text',
        content: thinkingContent || textContent,
        metadata: { 
          original: message,
          toolInfo
        },
        role: determineMessageRole(message)
      };
    }

    // Try parsing as JSON if it's a string
    if (typeof message === 'string') {
      try {
        const jsonContent = JSON.parse(message);
        return processJsonContent(jsonContent, advancedMode);
      } catch {
        // Not JSON, continue with text processing
      }
    }

    // Handle message object directly
    if (typeof message === 'object') {
      return processJsonContent(message, advancedMode);
    }

    // Handle plain text
    const text = String(message);
    if (!text.trim()) return null;

    // Extract tool info and thinking content before cleaning text
    const toolInfo = extractToolInfo(text);
    const thinkingContent = extractTagContent(text, 'thinking');

    // In basic mode, show clean text and thinking content
    if (!advancedMode) {
      // Remove all system tags except thinking
      const cleanedText = text
        .replace(/<environment_details>.*?<\/environment_details>/s, '')
        .replace(/<most_important_context>.*?<\/most_important_context>/s, '')
        .replace(/<task>.*?<\/task>/s, '')
        .replace(/<toolResponse>.*?<\/toolResponse>/s, '')
        .trim();

      if (cleanedText) {
        return {
          type: thinkingContent ? 'thinking' : 'text',
          content: thinkingContent || cleanedText,
          metadata: { 
            original: text,
            toolInfo
          },
          role: text.includes('user_feedback') ? 'user' : 'assistant'
        };
      }
      return null;
    }

    // Advanced mode: Process all message types with detailed formatting
    if (thinkingContent) {
      return {
        type: 'thinking',
        content: thinkingContent,
        metadata: { 
          original: text,
          toolInfo
        },
        role: 'assistant'
      };
    }

    const toolResponse = extractTagContent(text, 'toolResponse');
    if (toolResponse) {
      return {
        type: 'tool_response',
        content: extractTagContent(toolResponse, 'toolResult') || toolResponse,
        metadata: {
          status: extractTagContent(toolResponse, 'toolStatus'),
          name: extractTagContent(toolResponse, 'toolName'),
          toolInfo
        },
        role: 'system'
      };
    }

    // Clean and return any remaining text
    const cleanedText = text
      .replace(/<environment_details>.*?<\/environment_details>/s, '')
      .replace(/<most_important_context>.*?<\/most_important_context>/s, '')
      .replace(/<task>.*?<\/task>/s, '')
      .trim();

    if (cleanedText) {
      const role = text.includes('user_feedback') ? 'user' : 'assistant';
      debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Advanced mode text processed', { role });
      return {
        type: 'text',
        content: cleanedText,
        metadata: { 
          original: text,
          toolInfo
        },
        role
      };
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

/**
 * Groups related messages together
 */
export const groupMessages = (messages) => {
  const grouped = [];
  let currentGroup = null;

  messages.forEach((msg) => {
    // Start a new group for user messages or if no current group
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

  // Add the last group if it exists
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
  
  // Show timestamp if:
  // 1. First message in group
  // 2. Different role than previous
  // 3. More than 5 minutes from previous message
  return (
    message.role !== prevMessage.role ||
    !prevMessage.timestamp ||
    !message.timestamp ||
    Math.abs(message.timestamp - prevMessage.timestamp) > 5 * 60 * 1000
  );
};
