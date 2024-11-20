import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';
import FileViewer from './FileViewer';

const COMPONENT = 'FileExplorer';

const FileExplorer = ({ fileWatcher }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentPath, setCurrentPath] = useState('');
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEntries();
  }, [fileWatcher, currentPath]);

  const loadEntries = async () => {
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
  };

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
          <h3 className="text-lg font-medium">Project Files</h3>
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
  fileWatcher: PropTypes.object
};

export default FileExplorer;
