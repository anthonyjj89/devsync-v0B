// Debug levels
export const DEBUG_LEVELS = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG',
    PERF: 'PERF'
};

class DebugLogger {
    constructor() {
        this.startTimes = new Map();
        // Use window location to determine if we're in development
        this.debugEnabled = window.location.hostname === 'localhost';
        this.logLevel = 'INFO';
        this.logCache = new Map(); // Cache for recent logs to prevent duplicates
        this.cacheDuration = 1000; // 1 second cache duration
    }

    shouldLog(level) {
        const levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3,
            PERF: 4
        };

        return this.debugEnabled && levels[level] <= levels[this.logLevel];
    }

    formatMessage(level, component, message, data = null) {
        const timestamp = new Date().toISOString();
        const formattedData = data ? 
            JSON.stringify(data, (key, value) => {
                // Truncate long strings
                if (typeof value === 'string' && value.length > 200) {
                    return value.substring(0, 200) + '...';
                }
                return value;
            }) : '';

        return {
            timestamp,
            level,
            component,
            message: typeof message === 'string' ? message : JSON.stringify(message),
            data: formattedData,
            formatted: `[${timestamp}] [${level}] [${component}] ${message}`
        };
    }

    isDuplicateLog(logEntry) {
        const key = `${logEntry.level}-${logEntry.component}-${logEntry.message}`;
        const now = Date.now();
        const lastLog = this.logCache.get(key);

        if (lastLog && (now - lastLog) < this.cacheDuration) {
            return true;
        }

        this.logCache.set(key, now);
        return false;
    }

    log(level, component, message, data = null) {
        if (!this.shouldLog(level)) return;

        const logEntry = this.formatMessage(level, component, message, data);
        
        // Skip duplicate logs within cache duration
        if (this.isDuplicateLog(logEntry)) return;

        switch (level) {
            case DEBUG_LEVELS.ERROR:
                console.error(logEntry.formatted);
                break;
            case DEBUG_LEVELS.WARN:
                console.warn(logEntry.formatted);
                break;
            default:
                if (level !== DEBUG_LEVELS.DEBUG || this.debugEnabled) {
                    console.log(logEntry.formatted);
                }
        }

        return logEntry;
    }

    startTimer(operationId) {
        this.startTimes.set(operationId, performance.now());
    }

    endTimer(operationId, component) {
        const startTime = this.startTimes.get(operationId);
        if (startTime) {
            const duration = performance.now() - startTime;
            if (duration > 1000) { // Only log operations that take more than 1 second
                this.log(DEBUG_LEVELS.PERF, component, `Operation ${operationId} completed`, {
                    duration: `${duration.toFixed(2)}ms`
                });
            }
            this.startTimes.delete(operationId);
            return duration;
        }
        return null;
    }

    // Log state changes only if they're significant
    logStateChange(component, prevState, newState) {
        const changes = this.getStateChanges(prevState, newState);
        if (Object.keys(changes).length > 0) {
            this.log(DEBUG_LEVELS.DEBUG, component, 'State changed', { changes });
        }
    }

    getStateChanges(prevState, newState) {
        const changes = {};
        const allKeys = new Set([...Object.keys(prevState), ...Object.keys(newState)]);
        
        for (const key of allKeys) {
            if (prevState[key] !== newState[key]) {
                changes[key] = {
                    from: prevState[key],
                    to: newState[key]
                };
            }
        }
        return changes;
    }

    // Log API requests only in development
    logApiRequest(component, method, url) {
        if (this.debugEnabled) {
            this.log(DEBUG_LEVELS.DEBUG, component, `API Request: ${method} ${url}`);
        }
    }

    // Log API responses only if they're errors or slow
    logApiResponse(component, method, url, response, duration) {
        if (response.status >= 400 || duration > 1000) {
            this.log(DEBUG_LEVELS.WARN, component, `API Response: ${method} ${url}`, {
                status: response.status,
                duration: `${duration.toFixed(2)}ms`
            });
        }
    }

    // Log socket events only if they're errors or important state changes
    logSocketEvent(component, eventName, data = null) {
        if (eventName === 'error' || eventName === 'disconnect' || eventName === 'connect') {
            this.log(DEBUG_LEVELS.INFO, component, `Socket Event: ${eventName}`, data);
        }
    }

    // Log file operations only if they fail or are slow
    logFileOperation(component, operation, path, result = null) {
        if (result?.error || (result?.duration && result.duration > 1000)) {
            this.log(DEBUG_LEVELS.WARN, component, `File Operation: ${operation}`, {
                path,
                result
            });
        }
    }
}

export const debugLogger = new DebugLogger();
