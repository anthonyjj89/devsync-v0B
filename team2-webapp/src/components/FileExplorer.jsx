import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';
import FileViewer from './FileViewer';

const COMPONENT = 'FileExplorer';

const FileExplorer = ({ fileWatcher }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadFiles = async () => {
      if (!fileWatcher?.projectPath) {
        setError('No project path configured');
        return;
      }

      setLoading(true);
      setError('');

      try {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Loading project files');
        const subfolders = await fileWatcher.getSubfolders();
        setFiles(subfolders);
      } catch (error) {
        setError(`Failed to load files: ${error.message}`);
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error loading files', { error });
      } finally {
        setLoading(false);
      }
    };

    loadFiles();
  }, [fileWatcher]);

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
        Loading files...
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
        <h3 className="text-lg font-medium mb-4">Project Files</h3>
        <div className="space-y-2">
          {files.map((file) => (
            <button
              key={file}
              onClick={() => setSelectedFile(file)}
              className={`w-full text-left px-3 py-2 rounded transition-colors ${
                selectedFile === file
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-200'
              }`}
            >
              {file}
            </button>
          ))}
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
