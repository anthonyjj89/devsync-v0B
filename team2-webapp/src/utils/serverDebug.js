import { EventEmitter } from 'events';
import process from 'process';

// Debug levels
export const DEBUG_LEVELS = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG',
    PERF: 'PERF'
};

class ServerDebugLogger extends EventEmitter {
    constructor() {
        super();
        this.startTimes = new Map();
        this.debugEnabled = process.env.NODE_ENV !== 'production';
        this.logLevel = process.env.LOG_LEVEL || 'INFO';
        this.logCache = new Map();
        this.cacheDuration = 1000;
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
                if (typeof value === 'string' && value.length > 200) {
                    return value.substring(0, 200) + '...';
                }
                return value;
            }, 2) : '';

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

        // Console output
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

        // Emit log event
        this.emit('log', {
            timestamp: new Date().toLocaleTimeString(),
            level,
            component,
            message: logEntry.message,
            data: logEntry.data
        });

        return logEntry;
    }

    startTimer(operationId) {
        this.startTimes.set(operationId, performance.now());
    }

    endTimer(operationId, component) {
        const startTime = this.startTimes.get(operationId);
        if (startTime) {
            const duration = performance.now() - startTime;
            if (duration > 1000) {
                this.log(DEBUG_LEVELS.PERF, component, `Operation ${operationId} completed`, {
                    duration: `${duration.toFixed(2)}ms`
                });
            }
            this.startTimes.delete(operationId);
            return duration;
        }
        return null;
    }

    logFileOperation(component, operation, path, result = null) {
        if (result?.error || (result?.duration && result.duration > 1000)) {
            this.log(DEBUG_LEVELS.WARN, component, `File Operation: ${operation}`, {
                path,
                result
            });
        }
    }

    logSocketEvent(component, eventName, data = null) {
        if (eventName === 'error' || eventName === 'disconnect' || eventName === 'connect') {
            this.log(DEBUG_LEVELS.INFO, component, `Socket Event: ${eventName}`, data);
        }
    }
}

export const debugLogger = new ServerDebugLogger();
