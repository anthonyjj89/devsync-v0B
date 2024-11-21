# Message Flow Documentation (JSON Fix Branch)

## 1. Message Source Files

### 1.1 External File Structure
The application monitors JSON files that exist outside the project directory:
- `claude_messages.json`: Contains Claude AI messages
- `api_conversation_history.json`: Contains API interaction messages
- `last_updated.txt`: Tracks the last update timestamp

These files are typically located in task-specific folders within the user's system, for example:
```
C:/Users/username/AppData/Roaming/Code/User/globalStorage/kodu-ai.claude-dev-experimental/tasks/[task-id]/
```

## 2. Server-Side Processing

### 2.1 File Watching (server.js)
```javascript
const watchPaths = [
    joinPaths(basePath, CLAUDE_MESSAGES_PATH),
    joinPaths(basePath, API_HISTORY_PATH),
    joinPaths(basePath, LAST_UPDATED_PATH)
];

const watcher = chokidar.watch(watchPaths, {
    persistent: true,
    ignoreInitial: true,
    usePolling: true,
    interval: 1000,
    awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
    }
});
```

### 2.2 Message Reading (server.js)
```javascript
async function readMessagesFromFile(filePath) {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // Handle both array format and {messages: [...]} format
    const messages = Array.isArray(data) ? data : (data.messages || []);
    
    // Filter out null/undefined messages but keep all valid objects
    const validMessages = messages.filter(msg => 
        msg !== null && typeof msg === 'object'
    );
    
    return validMessages;
}
```

### 2.3 API Endpoints
```javascript
app.get('/api/claude-messages', async (req, res) => {
    const basePath = joinPaths(normalizePath(rawBasePath), taskFolder);
    const filePath = joinPaths(basePath, CLAUDE_MESSAGES_PATH);
    const messages = await readMessagesFromFile(filePath);
    res.json(messages);
});

app.get('/api/api-messages', async (req, res) => {
    const basePath = joinPaths(normalizePath(rawBasePath), taskFolder);
    const filePath = joinPaths(basePath, API_HISTORY_PATH);
    const messages = await readMessagesFromFile(filePath);
    res.json(messages);
});
```

## 3. Client-Side Processing

### 3.1 FileWatcher Service (fileWatcher.js)
```javascript
async checkAndUpdate() {
    const [claudeMessages, apiMessages] = await Promise.all([
        this.readFile('claude'),
        this.readFile('api')
    ]);

    if (claudeMessages) {
        this.onUpdate('claude', claudeMessages);
    }
    if (apiMessages) {
        this.onUpdate('api', apiMessages);
    }
}
```

### 3.2 Message Processing (messageProcessor.js)
```javascript
export const processMessageContent = (message, advancedMode = false) => {
    if (!message) return null;

    const cacheKey = JSON.stringify({ message, mode: advancedMode });
    if (processedCache.has(cacheKey)) {
        return processedCache.get(cacheKey);
    }

    // Handle array content
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
            metadata: { original: message, toolInfo },
            role: determineMessageRole(message)
        };
    }
}
```

## 4. UI Rendering

### 4.1 Message List (MessageList.jsx)
```javascript
const timelineItems = messages.reduce((acc, message) => {
    // Add chat message
    acc.push({
        ...message,
        type: 'chat'
    });

    // Add file activity if present
    const metadata = message.metadata || {};
    const toolInfo = metadata.toolInfo || {};
    if (toolInfo.tool) {
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
}, []).sort((a, b) => a.timestamp - b.timestamp);
```

### 4.2 Message Bubble (MessageBubble.jsx)
```javascript
const renderContent = () => {
    if (isError && errorText) {
        return errorText;
    }

    if (type === 'api_request' && metadata?.isApiRequest) {
        return <JsonContent content={text} />;
    }

    if (type === 'thinking') {
        return (
            <div className="flex items-center gap-2">
                <span className="animate-pulse">💭</span>
                <span>{text}</span>
            </div>
        );
    }

    return renderTextWithFileLinks(text);
};
```

## 5. Task Folder Selection

### 5.1 TaskFolderSelect Component
```javascript
function TaskFolderSelect({ currentFolder, onSelect }) {
    const [isOpen, setIsOpen] = useState(false);
    const [recentFolders, setRecentFolders] = useState([]);

    useEffect(() => {
        const recent = JSON.parse(
            localStorage.getItem('recentTaskFolders') || '[]'
        );
        setRecentFolders(recent);
    }, []);

    const handleSelect = (folder) => {
        const recent = JSON.parse(
            localStorage.getItem('recentTaskFolders') || '[]'
        );
        const updated = [folder, ...recent.filter(f => f !== folder)]
            .slice(0, 5);
        localStorage.setItem('recentTaskFolders', 
            JSON.stringify(updated));
        
        onSelect(folder);
        setIsOpen(false);
    };
}
```

### 5.2 Path Configuration
```javascript
// In App.jsx
const [monitoringConfig, setMonitoringConfig] = useState(() => ({
    basePath: localStorage.getItem('koduAI.path') || '',
    taskFolder: localStorage.getItem('koduAI.taskFolder') || '',
    projectPath: localStorage.getItem('project.path') || ''
}));
```

## 6. Data Flow Sequence

1. External JSON file is updated
2. Server detects change via chokidar
3. Server reads file and filters invalid messages
4. Server emits WebSocket event
5. Client FileWatcher receives event
6. FileWatcher triggers message update
7. App component receives new messages
8. Messages are processed through messageProcessor
9. Processed messages passed to MessageList
10. MessageList renders messages using MessageBubble components

## 7. Error Handling

### 7.1 Server-Side
```javascript
try {
    const messages = await readMessagesFromFile(filePath);
    res.json(messages);
} catch (error) {
    debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 
        'Error reading messages', error);
    res.json({ error: 'Error reading/parsing messages' });
}
```

### 7.2 Client-Side
```javascript
if (!advancedMode && message.isError && message.errorText) {
    return {
        type: 'text',
        content: message.errorText,
        metadata: { original: message, isError: true },
        role: 'system'
    };
}
```

## 8. Performance Features

- Message caching with compound keys
- Memoized content extraction
- Filtered invalid messages
- Periodic cache clearing
- WebSocket-based updates
- Optimized file reading
