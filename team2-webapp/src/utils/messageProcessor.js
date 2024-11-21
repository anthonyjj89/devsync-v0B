import { debugLogger, DEBUG_LEVELS } from './debug';

const COMPONENT = 'MessageProcessor';

const messageCache = new Map();

export const processMessageContent = (message, advancedMode = false) => {
    if (!message) return null;

    const cacheKey = JSON.stringify({ message, mode: advancedMode });
    if (messageCache.has(cacheKey)) {
        return messageCache.get(cacheKey);
    }

    try {
        // Handle array content
        if (message.content && Array.isArray(message.content)) {
            const textContent = message.content
                .filter(item => item.type === 'text')
                .map(item => item.text)
                .join('\n');

            const result = {
                type: 'text',
                content: textContent,
                role: message.role || 'assistant',
                metadata: message.metadata || {}
            };
            messageCache.set(cacheKey, result);
            return result;
        }

        // Handle string content
        if (typeof message.text === 'string') {
            const result = {
                type: 'text',
                content: message.text,
                role: message.role || 'assistant',
                metadata: message.metadata || {}
            };
            messageCache.set(cacheKey, result);
            return result;
        }

        // Handle tool messages
        if (message.type === 'ask' && message.ask === 'tool') {
            try {
                const toolData = JSON.parse(message.text);
                const result = {
                    type: 'tool_response',
                    content: toolData.result || toolData.question || message.text,
                    role: 'system',
                    metadata: {
                        isToolRequest: true,
                        tool: toolData.tool,
                        path: toolData.path,
                        status: toolData.approvalState || 'unknown',
                        error: toolData.error,
                        toolResult: toolData.result,
                        approvalState: toolData.approvalState,
                        toolStatus: toolData.status,
                        ...message.metadata
                    }
                };
                messageCache.set(cacheKey, result);
                return result;
            } catch (error) {
                debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error parsing tool data', {
                    error: error.message,
                    messageText: message.text
                });
                return null;
            }
        }

        // Handle error messages
        if (message.isError) {
            const result = {
                type: 'error',
                content: message.errorText || message.text,
                role: 'system',
                metadata: {
                    isError: true,
                    ...message.metadata
                }
            };
            messageCache.set(cacheKey, result);
            return result;
        }

        // Default handling
        const result = {
            type: message.type || 'text',
            content: message.text || message.content,
            role: message.role || 'assistant',
            metadata: message.metadata || {}
        };
        messageCache.set(cacheKey, result);
        return result;

    } catch (error) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error processing message', {
            error: error.message,
            message
        });
        return null;
    }
};

// Keep cache size manageable
setInterval(() => {
    if (messageCache.size > 1000) {
        const oldestKey = messageCache.keys().next().value;
        messageCache.delete(oldestKey);
    }
}, 60000); // Clean up every minute
