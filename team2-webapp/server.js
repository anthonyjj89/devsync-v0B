import fs from 'fs';
import chokidar from 'chokidar';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { basename, join, normalize, sep } from 'path';
import { debugLogger, DEBUG_LEVELS } from './src/utils/serverDebug.js';
import process from 'process';

const COMPONENT = 'Server';

fileURLToPath(import.meta.url);

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

const CLAUDE_MESSAGES_PATH = 'claude_messages.json';
const API_HISTORY_PATH = 'api_conversation_history.json';
const LAST_UPDATED_PATH = 'last_updated.txt';

// Store active watchers and client subscriptions
const activeWatchers = new Map();
const fileWatchers = new Map();
const clientSubscriptions = new Map();

function normalizePath(path) {
    const normalized = normalize(path).split('/').join(sep);
    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Path normalized', {
        original: path,
        normalized
    });
    return normalized;
}

function joinPaths(...paths) {
    const joined = normalize(join(...paths)).split('/').join(sep);
    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Paths joined', {
        paths,
        result: joined
    });
    return joined;
}

function validateMessage(msg) {
    if (!msg || typeof msg !== 'object') {
        debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Invalid message format', {
            type: typeof msg
        });
        return false;
    }
    
    // More detailed validation logging
    const validation = {
        hasType: !!msg.type,
        hasSay: !!msg.say,
        hasText: typeof msg.text === 'string',
        hasContent: Array.isArray(msg.content) || typeof msg.content === 'string',
        isValidType: msg.type === 'say' || msg.type === 'ask'
    };

    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Message validation', validation);
    
    // Accept any message with valid structure
    return validation.hasType && (
        (msg.type === 'say') ||
        (msg.type === 'ask') ||
        validation.hasText ||
        validation.hasContent
    );
}

async function readMessagesFromFile(filePath) {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Reading messages from file', {
        filePath
    });

    try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        let data;
        try {
            data = JSON.parse(content);
            debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Successfully parsed JSON', {
                filePath,
                dataType: typeof data,
                isArray: Array.isArray(data)
            });
        } catch (parseError) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error parsing JSON', {
                filePath,
                error: parseError.message,
                content: content.substring(0, 100)
            });
            return [];
        }
        
        // Handle both array format and {messages: [...]} format
        const messages = Array.isArray(data) ? data : (data.messages || []);
        
        // Filter and validate messages
        const validMessages = messages.filter(msg => {
            const isValid = validateMessage(msg);
            if (!isValid) {
                debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Invalid message found', {
                    messageType: msg?.type,
                    messageFormat: typeof msg
                });
            }
            return isValid;
        });
        
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Messages processed', {
            filePath,
            totalMessages: messages.length,
            validMessages: validMessages.length
        });
        
        return validMessages;
    } catch (error) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error reading messages from file', {
            filePath,
            error: error.message,
            stack: error.stack
        });
        return [];
    }
}

async function getSubfolders(path) {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Getting subfolders', { path });
    
    try {
        const entries = await fs.promises.readdir(path, { withFileTypes: true });
        const folders = entries
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name)
            .sort();
            
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Subfolders retrieved', {
            path,
            count: folders.length,
            folders
        });
        
        return folders;
    } catch (error) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error getting subfolders', {
            path,
            error: error.message
        });
        throw error;
    }
}

function setupWatcher(basePath) {
    if (activeWatchers.has(basePath)) {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Closing existing watcher', {
            basePath
        });
        activeWatchers.get(basePath).close();
    }

    const watchPaths = [
        joinPaths(basePath, CLAUDE_MESSAGES_PATH),
        joinPaths(basePath, API_HISTORY_PATH),
        joinPaths(basePath, LAST_UPDATED_PATH)
    ];

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Setting up file watcher', {
        basePath,
        watchPaths
    });

    const watcher = chokidar.watch(watchPaths, {
        persistent: true,
        ignoreInitial: true,
        usePolling: true,
        interval: 1000,
        awaitWriteFinish: {
            stabilityThreshold: 300,
            pollInterval: 100
        }
    });

    let changeTimeout = null;
    watcher.on('change', async (filePath) => {
        if (changeTimeout) {
            clearTimeout(changeTimeout);
        }
        
        changeTimeout = setTimeout(async () => {
            try {
                const messages = await readMessagesFromFile(filePath);
                debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'File changed', {
                    file: basename(filePath),
                    messageCount: messages.length,
                    basePath
                });
                
                // Notify all clients subscribed to this path
                io.to(basePath).emit('fileUpdated', { 
                    file: basename(filePath),
                    path: basePath,
                    messageCount: messages.length,
                    timestamp: new Date().toISOString()
                });
            } catch (err) {
                debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error processing file change', {
                    error: err.message,
                    file: basename(filePath)
                });
            }
        }, 300); // Reduced debounce time
    });

    activeWatchers.set(basePath, watcher);
    return watcher;
}

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

app.get('/api/get-subfolders', async (req, res) => {
    const { path: rawPath } = req.query;
    if (!rawPath) {
        debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Missing path parameter');
        return res.json({ success: false, error: 'Path is required' });
    }

    const path = normalizePath(rawPath);
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Getting subfolders', { path });

    try {
        const folders = await getSubfolders(path);
        res.json({ success: true, entries: folders });
    } catch (error) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error getting subfolders', {
            path,
            error: error.message
        });
        res.json({
            success: false,
            error: `Failed to get subfolders: ${error.message}`
        });
    }
});

app.get('/api/validate-path', async (req, res) => {
    const { basePath: rawBasePath, taskFolder } = req.query;
    if (!rawBasePath) {
        debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Missing base path parameter');
        return res.json({ success: false, error: 'Base path is required' });
    }

    const basePath = taskFolder ? 
        joinPaths(normalizePath(rawBasePath), taskFolder) : 
        normalizePath(rawBasePath);

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Validating path', {
        basePath,
        taskFolder
    });

    try {
        await fs.promises.access(basePath);

        if (taskFolder) {
            const files = [CLAUDE_MESSAGES_PATH, API_HISTORY_PATH];
            const fileChecks = await Promise.all(
                files.map(async (file) => {
                    const fullPath = joinPaths(basePath, file);
                    try {
                        await fs.promises.access(fullPath);
                        return true;
                    } catch (err) {
                        debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Required file not found', {
                            file,
                            path: fullPath
                        });
                        return false;
                    }
                })
            );

            const allFilesExist = fileChecks.every(exists => exists);
            if (!allFilesExist) {
                debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Missing required files');
                return res.json({
                    success: false,
                    error: 'One or more required files are missing or inaccessible'
                });
            }

            setupWatcher(basePath);
        }
        
        res.json({ success: true });
    } catch (error) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Path validation failed', {
            error: error.message,
            basePath
        });
        res.json({
            success: false,
            error: `Failed to validate path: ${error.message}`
        });
    }
});

app.get('/api/claude-messages', async (req, res) => {
    const { basePath: rawBasePath, taskFolder } = req.query;
    if (!rawBasePath || !taskFolder) {
        debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Missing required parameters for claude messages');
        return res.json({ error: 'Both base path and task folder are required' });
    }

    const basePath = joinPaths(normalizePath(rawBasePath), taskFolder);
    const filePath = joinPaths(basePath, CLAUDE_MESSAGES_PATH);

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Reading claude messages', {
        basePath,
        filePath
    });

    try {
        const messages = await readMessagesFromFile(filePath);
        res.json(messages);
    } catch (error) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error reading claude messages', {
            error: error.message,
            filePath
        });
        res.json({ error: 'Error reading/parsing claude messages' });
    }
});

app.get('/api/api-messages', async (req, res) => {
    const { basePath: rawBasePath, taskFolder } = req.query;
    if (!rawBasePath || !taskFolder) {
        debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Missing required parameters for API messages');
        return res.json({ error: 'Both base path and task folder are required' });
    }

    const basePath = joinPaths(normalizePath(rawBasePath), taskFolder);
    const filePath = joinPaths(basePath, API_HISTORY_PATH);

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Reading API messages', {
        basePath,
        filePath
    });

    try {
        const messages = await readMessagesFromFile(filePath);
        res.json(messages);
    } catch (error) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error reading API messages', {
            error: error.message,
            filePath
        });
        res.json({ error: 'Error reading/parsing API messages' });
    }
});

app.get('/api/last-updated', async (req, res) => {
    const { basePath: rawBasePath, taskFolder } = req.query;
    if (!rawBasePath || !taskFolder) {
        debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Missing required parameters for last-updated');
        return res.json({ error: 'Both base path and task folder are required' });
    }

    const basePath = joinPaths(normalizePath(rawBasePath), taskFolder);
    const filePath = joinPaths(basePath, LAST_UPDATED_PATH);

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Reading last updated timestamp', {
        basePath,
        filePath
    });

    try {
        const timestamp = await fs.promises.readFile(filePath, 'utf8');
        res.json({ timestamp: timestamp.trim() });
    } catch (error) {
        debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Error reading last-updated, using current time', {
            error: error.message
        });
        const currentTimestamp = new Date().toISOString();
        res.json({ timestamp: currentTimestamp });
    }
});

io.on('connection', (socket) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Client connected', {
        id: socket.id
    });

    socket.on('subscribe', (path) => {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Client subscribed to path', {
            id: socket.id,
            path
        });
        
        // Track client subscriptions
        clientSubscriptions.set(socket.id, path);
        socket.join(path);

        // Ensure watcher exists for this path
        if (!activeWatchers.has(path)) {
            setupWatcher(path);
        }
    });

    socket.on('unsubscribe', (path) => {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Client unsubscribed from path', {
            id: socket.id,
            path
        });
        
        socket.leave(path);
        clientSubscriptions.delete(socket.id);

        // Check if any clients are still watching this path
        const hasSubscribers = Array.from(clientSubscriptions.values()).includes(path);
        if (!hasSubscribers && activeWatchers.has(path)) {
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'No more subscribers, closing watcher', {
                path
            });
            activeWatchers.get(path).close();
            activeWatchers.delete(path);
        }
    });

    socket.on('disconnect', () => {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Client disconnected', {
            id: socket.id
        });
        
        // Clean up client's subscriptions
        const path = clientSubscriptions.get(socket.id);
        if (path) {
            socket.leave(path);
            clientSubscriptions.delete(socket.id);

            // Check if any clients are still watching this path
            const hasSubscribers = Array.from(clientSubscriptions.values()).includes(path);
            if (!hasSubscribers && activeWatchers.has(path)) {
                debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'No more subscribers, closing watcher', {
                    path
                });
                activeWatchers.get(path).close();
                activeWatchers.delete(path);
            }
        }
    });
});

process.on('SIGINT', () => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Shutting down server');
    
    // Clean up all watchers
    for (const [path, watcher] of activeWatchers) {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Closing watcher', { path });
        watcher.close();
    }
    for (const [path, watcher] of fileWatchers) {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Closing file watcher', { path });
        watcher.close();
    }
    
    process.exit(0);
});

const PORT = 3002;
server.listen(PORT, () => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Server started', {
        port: PORT,
        mode: process.env.NODE_ENV || 'development'
    });
});
