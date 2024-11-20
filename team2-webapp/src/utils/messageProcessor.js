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

    // Handle array content
    if (Array.isArray(jsonContent.content)) {
      const textContent = jsonContent.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');

      return {
        type: 'text',
        content: textContent,
        metadata: { original: jsonContent },
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
        
        // In advanced mode, show the full tool request
        if (advancedMode) {
          return {
            type: 'api_request',
            content: formatJsonContent(toolData),
            metadata: { 
              tool: toolData.tool,
              isToolRequest: true 
            },
            role: 'system'
          };
        }
      } catch (e) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error parsing tool message', {
          error: e.message,
          text: jsonContent.text
        });
      }
    }

    // In basic mode, skip all other message types except direct AI/user communication
    if (!advancedMode) {
      if (jsonContent.type === 'say' && 
          jsonContent.say === 'text' && 
          !jsonContent.text?.includes('<thinking>')) {
        const role = determineMessageRole(jsonContent);
        debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Basic mode message processed', { role });
        return {
          type: 'text',
          content: jsonContent.text,
          metadata: { original: jsonContent },
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

    // Advanced mode: Handle thinking messages
    if (jsonContent.type === 'say' && 
        jsonContent.say === 'text' && 
        jsonContent.text?.includes('<thinking>')) {
      const thinkingContent = extractTagContent(jsonContent.text, 'thinking');
      if (thinkingContent) {
        return {
          type: 'thinking',
          content: thinkingContent,
          metadata: { original: jsonContent.text },
          role: 'assistant'
        };
      }
    }

    // Advanced mode: Handle other messages
    if (jsonContent.text) {
      const role = determineMessageRole(jsonContent);
      debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Advanced mode message processed', { role });
      return {
        type: 'system',
        content: jsonContent.text,
        metadata: { raw: jsonContent },
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
    // Handle message object with content array
    if (message.content && Array.isArray(message.content)) {
      return {
        type: 'text',
        content: message.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('\n'),
        metadata: { original: message },
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

    // In basic mode, only show clean text without any tags
    if (!advancedMode) {
      // Remove all system tags and keep only conversational content
      const cleanedText = text
        .replace(/<environment_details>.*?<\/environment_details>/s, '')
        .replace(/<most_important_context>.*?<\/most_important_context>/s, '')
        .replace(/<task>.*?<\/task>/s, '')
        .replace(/<thinking>.*?<\/thinking>/s, '')
        .replace(/<toolResponse>.*?<\/toolResponse>/s, '')
        .trim();

      if (cleanedText) {
        const role = text.includes('user_feedback') ? 'user' : 'assistant';
        debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Basic mode text processed', { role });
        return {
          type: 'text',
          content: cleanedText,
          metadata: { original: text },
          role
        };
      }
      return null;
    }

    // Advanced mode: Process all message types with detailed formatting
    const thinkingContent = extractTagContent(text, 'thinking');
    if (thinkingContent) {
      return {
        type: 'thinking',
        content: thinkingContent,
        metadata: { original: text },
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
          name: extractTagContent(toolResponse, 'toolName')
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
        metadata: { original: text },
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
