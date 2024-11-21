# Message Flow Documentation

## 1. Server API to Parsed Message Pipeline

### 1.1 Server API Endpoints
The server exposes several key endpoints for message handling:

```javascript
GET /api/claude-messages?basePath={path}&taskFolder={folder}
GET /api/api-messages?basePath={path}&taskFolder={folder}
GET /api/last-updated?basePath={path}&taskFolder={folder}
```

### 1.2 Message Reading Process
1. **Initial File Read**:
```javascript
async function readMessagesFromFile(filePath) {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const data = JSON.parse(content);
    // Handles both array format and {messages: [...]} format
    return Array.isArray(data) ? data : (data.messages || []);
}
```

2. **Message Transformation Pipeline**:
```javascript
// In App.jsx
const processedData = data?.map(msg => {
    const processedContent = processMessageContent(msg, advancedMode);
    return {
        ...msg,
        text: processedContent.content,
        type: processedContent.type,
        role: processedContent.role,
        metadata: {
            ...processedContent.metadata,
            source: type,
            processedRole: processedContent.role
        },
        timestamp: msg.ts || Date.now()
    };
}).filter(Boolean);
```

3. **Message Processing Steps**:
   - Extract content from XML-style tags
   - Determine message role (user/assistant/system)
   - Process tool information
   - Format JSON content
   - Cache processed results

### 1.3 Message Types and Processing
```javascript
// Message type determination
if (jsonContent.type === 'say' && jsonContent.say === 'user_feedback') {
    return {
        type: 'text',
        content: jsonContent.text,
        metadata: { isUserFeedback: true },
        role: 'user'
    };
}

// Tool message processing
if (jsonContent.type === 'ask' && jsonContent.ask === 'tool') {
    const toolData = JSON.parse(jsonContent.text);
    return {
        type: 'api_request',
        content: formatJsonContent(toolData),
        metadata: { 
            tool: toolData.tool,
            isToolRequest: true,
            toolInfo: {/*...*/}
        },
        role: 'system'
    };
}
```

## 2. Path and Task Folder Management

### 2.1 Task Folder Selection Component
The TaskFolderSelect component provides a dropdown interface for managing task folders:

```javascript
function TaskFolderSelect({ currentFolder, onSelect }) {
    const [isOpen, setIsOpen] = useState(false);
    const [recentFolders, setRecentFolders] = useState([]);

    // Load recent folders from localStorage
    useEffect(() => {
        const recent = JSON.parse(
            localStorage.getItem('recentTaskFolders') || '[]'
        );
        setRecentFolders(recent);
    }, []);
}
```

### 2.2 Recent Folders Management
```javascript
const handleSelect = (folder) => {
    // Update recent folders
    const recent = JSON.parse(
        localStorage.getItem('recentTaskFolders') || '[]'
    );
    const updated = [folder, ...recent.filter(f => f !== folder)]
        .slice(0, 5);  // Keep last 5 folders
    localStorage.setItem('recentTaskFolders', 
        JSON.stringify(updated));
    
    onSelect(folder);
};
```

### 2.3 Path Configuration Storage
```javascript
// In App.jsx
const [monitoringConfig, setMonitoringConfig] = useState(() => ({
    basePath: localStorage.getItem('koduAI.path') || '',
    taskFolder: localStorage.getItem('koduAI.taskFolder') || '',
    projectPath: localStorage.getItem('project.path') || ''
}));
```

### 2.4 Path Validation Process
1. **Base Path Validation**:
```javascript
// Server-side validation
app.get('/api/validate-path', async (req, res) => {
    const { basePath: rawBasePath, taskFolder } = req.query;
    const basePath = taskFolder ? 
        joinPaths(normalizePath(rawBasePath), taskFolder) : 
        normalizePath(rawBasePath);
    
    // Check path exists and is accessible
    await fs.promises.access(basePath);
});
```

2. **Required Files Check**:
```javascript
// Check for required JSON files
const files = [CLAUDE_MESSAGES_PATH, API_HISTORY_PATH];
const fileChecks = await Promise.all(
    files.map(async (file) => {
        const fullPath = joinPaths(basePath, file);
        try {
            await fs.promises.access(fullPath);
            return true;
        } catch (err) {
            return false;
        }
    })
);
```

### 2.5 File Watching Setup
```javascript
// Set up watchers for path
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

### 2.6 Path Update Workflow
1. User selects new task folder
2. App updates localStorage
3. FileWatcher service reinitializes
4. Server validates new paths
5. WebSocket connection refreshes
6. Messages reload from new location

## 3. Message Processing Details

### 3.1 Content Extraction
```javascript
const extractTagContent = (() => {
    const cache = new Map();
    
    return (text, tagName) => {
        const cacheKey = `${text}-${tagName}`;
        if (cache.has(cacheKey)) {
            return cache.get(cacheKey);
        }

        const regex = new RegExp(
            `<${tagName}>(.*?)</${tagName}>`, 's'
        );
        const match = text.match(regex);
        const result = match ? match[1].trim() : null;
        
        cache.set(cacheKey, result);
        return result;
    };
})();
```

### 3.2 Tool Information Processing
```javascript
const extractToolInfo = (text) => {
    const toolTags = [
        'read_file', 
        'write_to_file', 
        'list_files', 
        'search_files'
    ];
    
    for (const tag of toolTags) {
        const toolContent = extractTagContent(text, tag);
        if (toolContent) {
            return {
                tool: tag,
                path: extractTagContent(toolContent, 'path'),
                content: extractTagContent(toolContent, 'content')
            };
        }
    }
    return null;
};
```

### 3.3 Message Role Determination
```javascript
const determineMessageRole = (message) => {
    if (message.role) return message.role;

    if (Array.isArray(message.content)) {
        for (const item of message.content) {
            if (item.type === 'text' && 
                item.text?.includes('user_feedback')) {
                return 'user';
            }
        }
    }

    return 'assistant';
};
```

### 3.4 JSON Content Formatting
```javascript
const formatJsonContent = (() => {
    const cache = new Map();
    
    return (jsonStr) => {
        const cacheKey = typeof jsonStr === 'string' ? 
            jsonStr : JSON.stringify(jsonStr);
        
        if (cache.has(cacheKey)) {
            return cache.get(cacheKey);
        }

        try {
            const obj = typeof jsonStr === 'string' ? 
                JSON.parse(jsonStr) : jsonStr;
            const result = JSON.stringify(obj, null, 2);
            cache.set(cacheKey, result);
            return result;
        } catch (e) {
            return jsonStr;
        }
    };
})();
```

This detailed documentation covers the complete pipeline from server API to parsed message, including the task folder selection system and all intermediate processing steps. Each section includes actual code snippets and explanations of the implementation details.
