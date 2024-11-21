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
    pingTimeout: 60000, // Increase ping timeout
    pingInterval: 25000  // Increase ping interval
});

const CLAUDE_MESSAGES_PATH = 'claude_messages.json';
const API_HISTORY_PATH = 'api_conversation_history.json';
const LAST_UPDATED_PATH = 'last_updated.txt';

// Store active watchers
const activeWatchers = new Map();
const fileWatchers = new Map();

function normalizePath(path) {
    const normalized = normalize(path).split('/').join(sep);
    return normalized;
}

function joinPaths(...paths) {
    return normalize(join(...paths)).split('/').join(sep);
}

function validateMessage(msg) {
    if (!msg || typeof msg !== 'object') return false;
    
    // More lenient message validation
    if (msg.type === 'say') {
        return true; // Accept any 'say' message
    }
    
    if (msg.type === 'ask') {
        return true; // Accept any 'ask' message
    }
    
    // Default message validation - accept if it has either text or content
    return (typeof msg.text === 'string') || 
           (Array.isArray(msg.content)) ||
           (typeof msg.content === 'string');
}

async function readMessagesFromFile(filePath) {
    try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        let data;
        try {
            data = JSON.parse(content);
        } catch (parseError) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error parsing JSON', {
                filePath,
                error: parseError.message,
                content: content.substring(0, 100) // Log first 100 chars
            });
            return [];
        }
        
        // Handle both array format and {messages: [...]} format
        const messages = Array.isArray(data) ? data : (data.messages || []);
        
        // Filter out invalid messages but keep all valid objects
        const validMessages = messages.filter(msg => validateMessage(msg));
        
        debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Read messages from file', {
            filePath,
            originalCount: messages.length,
            validCount: validMessages.length
        });
        
        return validMessages;
    } catch (error) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error reading messages from file', {
            filePath,
            error: error.message
        });
        return [];
    }
}

async function getSubfolders(path) {
    const entries = await fs.promises.readdir(path, { withFileTypes: true });
    return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort();
}

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

app.get('/api/get-subfolders', async (req, res) => {
    const { path: rawPath } = req.query;
    if (!rawPath) {
        return res.json({ success: false, error: 'Path is required' });
    }

    const path = normalizePath(rawPath);

    try {
        const folders = await getSubfolders(path);
        res.json({ success: true, entries: folders });
    } catch (error) {
        res.json({
            success: false,
            error: `Failed to get subfolders: ${error.message}`
        });
    }
});

app.get('/api/validate-path', async (req, res) => {
    const { basePath: rawBasePath, taskFolder } = req.query;
    if (!rawBasePath) {
        return res.json({ success: false, error: 'Base path is required' });
    }

    const basePath = taskFolder ? 
        joinPaths(normalizePath(rawBasePath), taskFolder) : 
        normalizePath(rawBasePath);

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
                        return false;
                    }
                })
            );

            const allFilesExist = fileChecks.every(exists => exists);
            if (!allFilesExist) {
                return res.json({
                    success: false,
                    error: 'One or more required files are missing or inaccessible'
                });
            }

            if (activeWatchers.has(basePath)) {
                activeWatchers.get(basePath).close();
            }

            const watchPaths = [
                joinPaths(basePath, CLAUDE_MESSAGES_PATH),
                joinPaths(basePath, API_HISTORY_PATH),
                joinPaths(basePath, LAST_UPDATED_PATH)
            ];

            const watcher = chokidar.watch(watchPaths, {
                persistent: true,
                ignoreInitial: true,
                usePolling: true,
                interval: 1000, // Poll every second
                awaitWriteFinish: {
                    stabilityThreshold: 500, // Wait 500ms after last change
                    pollInterval: 100
                }
            });

            let changeTimeout = null;
            watcher.on('change', async (filePath) => {
                // Debounce file change events
                if (changeTimeout) {
                    clearTimeout(changeTimeout);
                }
                
                changeTimeout = setTimeout(async () => {
                    try {
                        // Read messages to validate the file before notifying clients
                        const messages = await readMessagesFromFile(filePath);
                        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'File changed', {
                            file: basename(filePath),
                            messageCount: messages.length
                        });
                        
                        io.emit('fileUpdated', { 
                            file: basename(filePath),
                            path: basePath,
                            messageCount: messages.length
                        });
                    } catch (err) {
                        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error reading changed file', err);
                    }
                }, 500); // 500ms debounce
            });

            activeWatchers.set(basePath, watcher);
        }
        
        res.json({ success: true });
    } catch (error) {
        res.json({
            success: false,
            error: `Failed to validate path: ${error.message}`
        });
    }
});

app.get('/api/claude-messages', async (req, res) => {
    const { basePath: rawBasePath, taskFolder } = req.query;
    if (!rawBasePath || !taskFolder) {
        return res.json({ error: 'Both base path and task folder are required' });
    }

    const basePath = joinPaths(normalizePath(rawBasePath), taskFolder);
    const filePath = joinPaths(basePath, CLAUDE_MESSAGES_PATH);

    try {
        const messages = await readMessagesFromFile(filePath);
        res.json(messages);
    } catch (error) {
        res.json({ error: 'Error reading/parsing claude messages' });
    }
});

app.get('/api/api-messages', async (req, res) => {
    const { basePath: rawBasePath, taskFolder } = req.query;
    if (!rawBasePath || !taskFolder) {
        return res.json({ error: 'Both base path and task folder are required' });
    }

    const basePath = joinPaths(normalizePath(rawBasePath), taskFolder);
    const filePath = joinPaths(basePath, API_HISTORY_PATH);

    try {
        const messages = await readMessagesFromFile(filePath);
        res.json(messages);
    } catch (error) {
        res.json({ error: 'Error reading/parsing API messages' });
    }
});

app.get('/api/last-updated', async (req, res) => {
    const { basePath: rawBasePath, taskFolder } = req.query;
    if (!rawBasePath || !taskFolder) {
        return res.json({ error: 'Both base path and task folder are required' });
    }

    const basePath = joinPaths(normalizePath(rawBasePath), taskFolder);
    const filePath = joinPaths(basePath, LAST_UPDATED_PATH);

    try {
        const timestamp = await fs.promises.readFile(filePath, 'utf8');
        res.json({ timestamp: timestamp.trim() });
    } catch (error) {
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
        socket.join(path);
    });

    socket.on('unsubscribe', (path) => {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Client unsubscribed from path', {
            id: socket.id,
            path
        });
        socket.leave(path);
    });

    socket.on('disconnect', () => {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Client disconnected', {
            id: socket.id
        });
    });
});

process.on('SIGINT', () => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Shutting down server');
    for (const watcher of activeWatchers.values()) {
        watcher.close();
    }
    for (const watcher of fileWatchers.values()) {
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
