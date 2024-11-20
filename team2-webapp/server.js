import fs from 'fs';
import chokidar from 'chokidar';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { basename, join, normalize } from 'path';
import { debugLogger, DEBUG_LEVELS } from './src/utils/debug.js';
import process from 'process';

const COMPONENT = 'Server';

fileURLToPath(import.meta.url); // Keep for ES modules file path resolution

debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Initializing server...');

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Configure paths for both JSON files
const CLAUDE_MESSAGES_PATH = 'claude_messages.json';
const API_HISTORY_PATH = 'api_conversation_history.json';
const LAST_UPDATED_PATH = 'last_updated.txt';

debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Configured file paths', {
    CLAUDE_MESSAGES_PATH,
    API_HISTORY_PATH,
    LAST_UPDATED_PATH
});

// Enable CORS for all routes
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// Store active watchers
const activeWatchers = new Map();

// Helper function to normalize path for Windows
function normalizePath(path) {
    // First normalize the path using the OS-specific separator
    const normalized = normalize(path);
    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Path normalized', {
        original: path,
        normalized
    });
    return normalized;
}

// Helper function to extract messages from JSON file
async function readMessagesFromFile(filePath) {
    try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        const data = JSON.parse(content);
        
        // Handle both array format and {messages: [...]} format
        const messages = Array.isArray(data) ? data : (data.messages || []);
        
        debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Read messages from file', {
            filePath,
            messageCount: messages.length
        });
        
        return messages;
    } catch (error) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error reading messages from file', {
            filePath,
            error: error.message
        });
        return [];
    }
}

// New endpoint to get subfolders
app.get('/api/get-subfolders', async (req, res) => {
    const requestId = `get-subfolders-${Date.now()}`;
    debugLogger.startTimer(requestId);
    
    const basePath = normalizePath(req.query.path);
    if (!basePath) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'No path provided for subfolders');
        return res.json({ success: false, error: 'No path provided' });
    }

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Getting subfolders', { basePath });

    try {
        // Check if base path exists and is accessible
        await fs.promises.access(basePath);
        
        // Get all items in the directory
        const items = await fs.promises.readdir(basePath, { withFileTypes: true });
        
        // Filter for directories only and get their names
        const folders = items
            .filter(item => item.isDirectory())
            .map(item => item.name)
            .sort((a, b) => b.localeCompare(a)); // Sort in descending order (newest first)

        const duration = debugLogger.endTimer(requestId, COMPONENT);
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Successfully retrieved subfolders', {
            basePath,
            folderCount: folders.length,
            durationMs: duration
        });

        res.json({ success: true, folders });
    } catch (error) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error getting subfolders', {
            basePath,
            error: error.message
        });
        res.json({
            success: false,
            error: `Failed to get subfolders: ${error.message}`
        });
    }
});

// Updated validate-path endpoint to handle task folders
app.get('/api/validate-path', async (req, res) => {
    const requestId = `validate-path-${Date.now()}`;
    debugLogger.startTimer(requestId);
    
    const { basePath: rawBasePath, taskFolder } = req.query;
    if (!rawBasePath || !taskFolder) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Missing required parameters');
        return res.json({ success: false, error: 'Both base path and task folder are required' });
    }

    const basePath = normalizePath(join(rawBasePath, taskFolder));
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Validating path', { basePath, taskFolder });

    try {
        // Check if all required files exist
        const files = [CLAUDE_MESSAGES_PATH, API_HISTORY_PATH, LAST_UPDATED_PATH];
        const fileChecks = await Promise.all(
            files.map(async (file) => {
                const fullPath = join(basePath, file);
                try {
                    await fs.promises.access(fullPath);
                    const content = await fs.promises.readFile(fullPath, 'utf8');
                    debugLogger.logFileOperation(COMPONENT, 'READ', fullPath, {
                        size: content.length,
                        isJson: file.endsWith('.json')
                    });
                    
                    if (file.endsWith('.json')) {
                        const messages = await readMessagesFromFile(fullPath);
                        debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, `Parsed ${file}`, {
                            messageCount: messages.length
                        });
                    }
                    return true;
                } catch (err) {
                    debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, `Error accessing file ${fullPath}`, err);
                    return false;
                }
            })
        );

        const allFilesExist = fileChecks.every(exists => exists);
        if (!allFilesExist) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Required files missing');
            return res.json({
                success: false,
                error: 'One or more required files are missing or inaccessible'
            });
        }

        // Stop existing watcher for this path if any
        if (activeWatchers.has(basePath)) {
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Stopping existing watcher', { basePath });
            activeWatchers.get(basePath).close();
        }

        // Set up new watcher for this path
        const watchPaths = [
            join(basePath, CLAUDE_MESSAGES_PATH),
            join(basePath, API_HISTORY_PATH),
            join(basePath, LAST_UPDATED_PATH)
        ].map(normalizePath);

        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Setting up file watchers', { watchPaths });

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

        watcher.on('change', async (filePath) => {
            const fileChangeId = `file-change-${Date.now()}`;
            debugLogger.startTimer(fileChangeId);
            
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'File changed', { filePath });
            
            try {
                if (filePath.endsWith('.json')) {
                    const messages = await readMessagesFromFile(filePath);
                    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Parsed changed file', {
                        messageCount: messages.length
                    });
                }

                io.emit('fileUpdated', { 
                    file: basename(filePath),
                    path: basePath
                });

                debugLogger.endTimer(fileChangeId, COMPONENT);
            } catch (err) {
                debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error reading changed file', err);
            }
        });

        activeWatchers.set(basePath, watcher);
        const duration = debugLogger.endTimer(requestId, COMPONENT);
        
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Path validation successful', {
            basePath,
            durationMs: duration
        });
        
        res.json({ success: true });
    } catch (error) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Path validation error', error);
        res.json({
            success: false,
            error: `Failed to validate path: ${error.message}`
        });
    }
});

// Updated API endpoints to handle task folders
app.get('/api/claude-messages', async (req, res) => {
    const requestId = `fetch-claude-${Date.now()}`;
    debugLogger.startTimer(requestId);
    
    const { basePath: rawBasePath, taskFolder } = req.query;
    if (!rawBasePath || !taskFolder) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Missing required parameters');
        return res.json({ error: 'Both base path and task folder are required' });
    }

    const basePath = normalizePath(join(rawBasePath, taskFolder));
    const filePath = join(basePath, CLAUDE_MESSAGES_PATH);
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Reading claude messages', { filePath });

    try {
        const messages = await readMessagesFromFile(filePath);
        
        debugLogger.logFileOperation(COMPONENT, 'READ_CLAUDE', filePath, {
            messageCount: messages.length
        });
        
        const duration = debugLogger.endTimer(requestId, COMPONENT);
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Claude messages read successfully', {
            messageCount: messages.length,
            durationMs: duration
        });
        
        res.json(messages);
    } catch (error) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error reading claude messages', error);
        res.json({ error: 'Error reading/parsing claude messages' });
    }
});

app.get('/api/api-messages', async (req, res) => {
    const requestId = `fetch-api-${Date.now()}`;
    debugLogger.startTimer(requestId);
    
    const { basePath: rawBasePath, taskFolder } = req.query;
    if (!rawBasePath || !taskFolder) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Missing required parameters');
        return res.json({ error: 'Both base path and task folder are required' });
    }

    const basePath = normalizePath(join(rawBasePath, taskFolder));
    const filePath = join(basePath, API_HISTORY_PATH);
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Reading API messages', { filePath });

    try {
        const messages = await readMessagesFromFile(filePath);
        
        debugLogger.logFileOperation(COMPONENT, 'READ_API', filePath, {
            messageCount: messages.length
        });
        
        const duration = debugLogger.endTimer(requestId, COMPONENT);
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'API messages read successfully', {
            messageCount: messages.length,
            durationMs: duration
        });
        
        res.json(messages);
    } catch (error) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error reading API messages', error);
        res.json({ error: 'Error reading/parsing API messages' });
    }
});

app.get('/api/last-updated', async (req, res) => {
    const requestId = `fetch-timestamp-${Date.now()}`;
    debugLogger.startTimer(requestId);
    
    const { basePath: rawBasePath, taskFolder } = req.query;
    if (!rawBasePath || !taskFolder) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Missing required parameters');
        return res.json({ error: 'Both base path and task folder are required' });
    }

    const basePath = normalizePath(join(rawBasePath, taskFolder));
    const filePath = join(basePath, LAST_UPDATED_PATH);
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Reading last updated timestamp', { filePath });

    try {
        const timestamp = await fs.promises.readFile(filePath, 'utf8');
        
        debugLogger.logFileOperation(COMPONENT, 'READ_TIMESTAMP', filePath, {
            timestamp: timestamp.trim()
        });
        
        const duration = debugLogger.endTimer(requestId, COMPONENT);
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Timestamp read successfully', {
            timestamp: timestamp.trim(),
            durationMs: duration
        });
        
        res.json({ timestamp: timestamp.trim() });
    } catch (error) {
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error reading timestamp', error);
        res.json({ error: 'Error reading last updated file' });
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    const socketId = socket.id;
    debugLogger.logSocketEvent(COMPONENT, 'connection', { socketId });
    
    socket.on('disconnect', () => {
        debugLogger.logSocketEvent(COMPONENT, 'disconnect', { socketId });
    });
});

// Cleanup watchers on server shutdown
process.on('SIGINT', () => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Server shutting down, cleaning up watchers...');
    for (const watcher of activeWatchers.values()) {
        watcher.close();
    }
    process.exit(0);
});

// Start the server
const PORT = 3002;
server.listen(PORT, () => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Server started', {
        port: PORT,
        mode: process.env.NODE_ENV || 'development'
    });
});
