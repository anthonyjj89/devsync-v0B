import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'FileHistory';

const FileHistory = ({ fileWatcher, filePath, onVersionSelect, currentVersion }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!fileWatcher || !filePath) return;
    loadHistory();
  }, [fileWatcher, filePath]);

  const loadHistory = async () => {
    setLoading(true);
    setError('');

    try {
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Loading file history', { filePath });
      const response = await fileWatcher.getFileHistory(filePath);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load history');
      }

      // Add the current version to the history
      const fullHistory = [
        {
          version: 'latest',
          timestamp: Date.now(),
          changes: 'Current version'
        },
        ...response.history
      ];

      setHistory(fullHistory);
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'History loaded', {
        filePath,
        entryCount: fullHistory.length
      });
    } catch (error) {
      setError('Failed to load file history');
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error loading history', { error });
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  if (loading) {
    return (
      <div className="p-4 bg-blue-100 text-blue-700 rounded">
        Loading history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="border-l border-gray-200 h-full flex flex-col">
      <div className="p-4 bg-gray-50 border-b">
        <h3 className="text-lg font-medium">File History</h3>
        <p className="text-sm text-gray-600 mt-1 truncate" title={filePath}>
          {filePath}
        </p>
      </div>
      <div className="overflow-y-auto flex-1">
        {history.map((entry) => (
          <button
            key={entry.version}
            onClick={() => onVersionSelect(entry.version)}
            className={`w-full text-left p-4 border-b hover:bg-gray-50 transition-colors ${
              currentVersion === entry.version ? 'bg-blue-50' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {entry.version === 'latest' ? 'Current Version' : `Version ${entry.version}`}
              </span>
              <span className="text-xs text-gray-500">
                {formatTimestamp(entry.timestamp)}
              </span>
            </div>
            {entry.changes && (
              <p className="text-sm text-gray-600 mt-1">
                {entry.changes}
              </p>
            )}
          </button>
        ))}
        {history.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            No history available
          </div>
        )}
      </div>
    </div>
  );
};

FileHistory.propTypes = {
  fileWatcher: PropTypes.object,
  filePath: PropTypes.string,
  onVersionSelect: PropTypes.func.isRequired,
  currentVersion: PropTypes.string
};

export default FileHistory;
