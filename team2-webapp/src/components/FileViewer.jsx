import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';
import FileHistory from './FileHistory';

const COMPONENT = 'FileViewer';

const FileViewer = ({ fileWatcher, filePath, initialVersion }) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(initialVersion || 'latest');

  useEffect(() => {
    loadContent();
  }, [fileWatcher, filePath, currentVersion]);

  useEffect(() => {
    if (initialVersion) {
      setCurrentVersion(initialVersion);
    }
  }, [initialVersion]);

  const loadContent = async () => {
    if (!fileWatcher || !filePath) return;

    setLoading(true);
    setError('');

    try {
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Loading file content', { 
        filePath,
        version: currentVersion 
      });
      const fileContent = await fileWatcher.readProjectFile(filePath, currentVersion);
      setContent(fileContent);
    } catch (error) {
      setError(`Failed to load file: ${error.message}`);
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error loading file content', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleVersionSelect = (version) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Version selected', { 
      filePath,
      version 
    });
    setCurrentVersion(version);
  };

  if (!filePath) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select a file to view its contents
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* File Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-white rounded shadow h-full flex flex-col">
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="text-lg font-medium truncate" title={filePath}>
              {filePath}
            </h3>
            {currentVersion !== 'latest' && (
              <div className="mt-1 text-sm text-blue-600">
                Viewing version: {currentVersion}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 bg-blue-100 text-blue-700">
                Loading file content...
              </div>
            ) : error ? (
              <div className="p-4 bg-red-100 text-red-700">
                {error}
              </div>
            ) : (
              <pre className="whitespace-pre-wrap bg-gray-50 p-4 h-full overflow-x-auto">
                {content}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* File History */}
      <div className="w-80 bg-white border-l">
        <FileHistory
          fileWatcher={fileWatcher}
          filePath={filePath}
          onVersionSelect={handleVersionSelect}
          currentVersion={currentVersion}
        />
      </div>
    </div>
  );
};

FileViewer.propTypes = {
  fileWatcher: PropTypes.object,
  filePath: PropTypes.string,
  initialVersion: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ])
};

export default FileViewer;
