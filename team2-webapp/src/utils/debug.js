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
        this.debugEnabled = true;
    }

    formatMessage(level, component, message, data = null) {
        const timestamp = new Date().toISOString();
        const formattedData = data ? JSON.stringify(data, null, 2) : '';
        return {
            timestamp,
            level,
            component,
            message: typeof message === 'string' ? message : JSON.stringify(message),
            data: formattedData,
            formatted: `[${timestamp}] [${level}] [${component}] ${message}${formattedData ? '\n' + formattedData : ''}`
        };
    }

    log(level, component, message, data = null) {
        if (!this.debugEnabled) return;

        const logEntry = this.formatMessage(level, component, message, data);
        
        switch (level) {
            case DEBUG_LEVELS.ERROR:
                console.error(logEntry.formatted);
                break;
            case DEBUG_LEVELS.WARN:
                console.warn(logEntry.formatted);
                break;
            default:
                console.log(logEntry.formatted);
        }

        return logEntry;
    }

    // Start timing an operation
    startTimer(operationId) {
        this.startTimes.set(operationId, performance.now());
    }

    // End timing and log duration
    endTimer(operationId, component) {
        const startTime = this.startTimes.get(operationId);
        if (startTime) {
            const duration = performance.now() - startTime;
            this.log(DEBUG_LEVELS.PERF, component, `Operation ${operationId} completed`, {
                duration: `${duration.toFixed(2)}ms`,
                operationId
            });
            this.startTimes.delete(operationId);
            return duration;
        }
        return null;
    }

    // Log state changes
    logStateChange(component, prevState, newState) {
        this.log(DEBUG_LEVELS.DEBUG, component, 'State changed', {
            prev: prevState,
            new: newState,
            changes: this.getStateChanges(prevState, newState)
        });
    }

    // Helper to identify what changed between states
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

    // Log API requests
    logApiRequest(component, method, url, body = null) {
        this.log(DEBUG_LEVELS.DEBUG, component, `API Request: ${method} ${url}`, body);
    }

    // Log API responses
    logApiResponse(component, method, url, response, duration) {
        this.log(DEBUG_LEVELS.DEBUG, component, `API Response: ${method} ${url}`, {
            status: response.status,
            duration: `${duration.toFixed(2)}ms`,
            data: response.data
        });
    }

    // Log socket events
    logSocketEvent(component, eventName, data = null) {
        this.log(DEBUG_LEVELS.DEBUG, component, `Socket Event: ${eventName}`, data);
    }

    // Log file operations
    logFileOperation(component, operation, path, result = null) {
        this.log(DEBUG_LEVELS.DEBUG, component, `File Operation: ${operation}`, {
            path,
            result
        });
    }
}

export const debugLogger = new DebugLogger();
