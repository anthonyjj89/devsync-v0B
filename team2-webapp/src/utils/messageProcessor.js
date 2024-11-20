import { debugLogger, DEBUG_LEVELS } from './debug';

const COMPONENT = 'MessageProcessor';

/**
 * Extracts content from XML-style tags
 */
const extractTagContent = (text, tagName) => {
  const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 's');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
};

/**
 * Processes JSON content based on message type
 */
const processJsonContent = (jsonContent, advancedMode = false) => {
  try {
    // Handle user feedback - always show in both modes
    if (jsonContent.type === 'say' && jsonContent.say === 'user_feedback') {
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
        // Parse the text field as JSON to extract the question
        const toolData = JSON.parse(jsonContent.text);
        if (toolData.tool === 'ask_followup_question') {
          return {
            type: 'question',
            content: toolData.question,
            metadata: { tool: 'ask_followup_question' },
            role: 'assistant'
          };
        }
      } catch (e) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error parsing tool message', {
          error: e.message,
          text: jsonContent.text
        });
      }
    }

    // In basic mode, skip all other message types
    if (!advancedMode) {
      return null;
    }

    // Advanced mode: Handle API requests
    if (jsonContent.type === 'say' && jsonContent.say === 'api_req_started') {
      return {
        type: 'api_request',
        content: 'API Request',
        metadata: {
          request: JSON.parse(jsonContent.text)
        },
        role: 'system'
      };
    }

    // Advanced mode: Handle thinking messages
    if (jsonContent.type === 'say' && 
        jsonContent.say === 'text' && 
        jsonContent.text.includes('<thinking>')) {
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
      return {
        type: 'system',
        content: jsonContent.text,
        metadata: { raw: jsonContent },
        role: 'system'
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
export const processMessageContent = (text, advancedMode = false) => {
  if (!text) return null;

  try {
    // Try parsing as JSON first
    try {
      const jsonContent = JSON.parse(text);
      return processJsonContent(jsonContent, advancedMode);
    } catch {
      // Not JSON, continue with text processing
    }

    // In basic mode, only show clean text without any tags
    if (!advancedMode) {
      // Remove all system tags
      const cleanedText = text
        .replace(/<environment_details>.*?<\/environment_details>/s, '')
        .replace(/<most_important_context>.*?<\/most_important_context>/s, '')
        .replace(/<task>.*?<\/task>/s, '')
        .replace(/<thinking>.*?<\/thinking>/s, '')
        .replace(/<toolResponse>.*?<\/toolResponse>/s, '')
        .trim();

      if (cleanedText) {
        return {
          type: 'text',
          content: cleanedText,
          metadata: { original: text },
          role: 'assistant'
        };
      }
      return null;
    }

    // Advanced mode: Process all message types
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
      return {
        type: 'text',
        content: cleanedText,
        metadata: { original: text },
        role: 'assistant'
      };
    }

    return null;
  } catch (error) {
    debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error processing message content', {
      error: error.message,
      text
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
