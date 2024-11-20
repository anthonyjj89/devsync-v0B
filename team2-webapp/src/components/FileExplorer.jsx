import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';
import FileViewer from './FileViewer';

const COMPONENT = 'FileExplorer';

const FileExplorer = ({ fileWatcher, initialFile, initialVersion }) => {
  const [selectedFile, setSelectedFile] = useState(initialFile);
  const [currentPath, setCurrentPath] = useState('');
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [watcherPath, setWatcherPath] = useState(fileWatcher?.projectPath);

  // Update watcherPath when fileWatcher.projectPath changes
  useEffect(() => {
    if (fileWatcher?.projectPath !== watcherPath) {
      setWatcherPath(fileWatcher?.projectPath);
      // Reset state when project path changes
      setCurrentPath('');
      setSelectedFile(null);
      setEntries([]);
    }
  }, [fileWatcher?.projectPath, watcherPath]);

  const loadEntries = useCallback(async () => {
    if (!fileWatcher?.projectPath) {
      setError('No project path configured');
      return;
    }

    setLoading(true);
    setError('');

    try {
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Loading project entries', { currentPath });
      const response = await fileWatcher.getSubfolders(currentPath);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load entries');
      }
      
      setEntries(response.entries || []);
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Entries loaded', { 
        count: response.entries?.length,
        currentPath
      });
    } catch (error) {
      setError(`Failed to load entries: ${error.message}`);
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error loading entries', { error });
    } finally {
      setLoading(false);
    }
  }, [fileWatcher, currentPath]);

  // Load entries when path changes or watcher path changes
  useEffect(() => {
    if (watcherPath) {
      loadEntries();
    }
  }, [loadEntries, watcherPath]);

  // Effect to handle initialFile changes
  useEffect(() => {
    if (initialFile) {
      const lastSlashIndex = initialFile.lastIndexOf('/');
      if (lastSlashIndex !== -1) {
        setCurrentPath(initialFile.substring(0, lastSlashIndex));
      }
      setSelectedFile(initialFile);
    }
  }, [initialFile]);

  const handleEntryClick = (entry) => {
    if (entry.type === 'directory') {
      const newPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      setCurrentPath(newPath);
      setSelectedFile(null);
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Navigating to directory', { 
        newPath,
        entry 
      });
    } else {
      const filePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      setSelectedFile(filePath);
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Selected file', { 
        filePath,
        entry 
      });
    }
  };

  const handleBackClick = () => {
    if (!currentPath) return;
    const lastSlashIndex = currentPath.lastIndexOf('/');
    const newPath = lastSlashIndex === -1 ? '' : currentPath.substring(0, lastSlashIndex);
    setCurrentPath(newPath);
    setSelectedFile(null);
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Navigating back', { 
      from: currentPath,
      to: newPath 
    });
  };

  if (!fileWatcher?.projectPath) {
    return (
      <div className="p-4 bg-yellow-100 text-yellow-700 rounded">
        Please configure a project path in settings.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 bg-blue-100 text-blue-700 rounded">
        Loading entries...
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
    <div className="flex h-full">
      {/* File List */}
      <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Project Files</h3>
            <button
              onClick={loadEntries}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Refresh files"
              disabled={loading}
            >
              <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          {currentPath && (
            <button
              onClick={handleBackClick}
              className="mt-2 px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
            >
              ← Back
            </button>
          )}
          <div className="mt-2 text-sm text-gray-600 truncate" title={currentPath || '/'}>
            {currentPath || '/'}
          </div>
        </div>
        <div className="space-y-1">
          {entries.map((entry) => (
            <button
              key={entry.name}
              onClick={() => handleEntryClick(entry)}
              className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center gap-2 ${
                selectedFile === (currentPath ? `${currentPath}/${entry.name}` : entry.name)
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-200'
              }`}
            >
              <span className="text-lg">
                {entry.type === 'directory' ? '📁' : '📄'}
              </span>
              <span className="truncate">{entry.name}</span>
            </button>
          ))}
          {entries.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              No files or folders found
            </div>
          )}
        </div>
      </div>

      {/* File Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {selectedFile ? (
          <FileViewer
            fileWatcher={fileWatcher}
            filePath={selectedFile}
            initialVersion={initialVersion}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a file to view its contents
          </div>
        )}
      </div>
    </div>
  );
};

FileExplorer.propTypes = {
  fileWatcher: PropTypes.object,
  initialFile: PropTypes.string,
  initialVersion: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ])
};

export default FileExplorer;
