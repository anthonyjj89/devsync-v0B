import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'FileViewer';

const FileViewer = ({ fileWatcher, filePath }) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
      if (!fileWatcher || !filePath) return;

      setLoading(true);
      setError('');

      try {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Loading file content', { filePath });
        const fileContent = await fileWatcher.readProjectFile(filePath);
        setContent(fileContent);
      } catch (error) {
        setError(`Failed to load file: ${error.message}`);
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error loading file content', { error });
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [fileWatcher, filePath]);

  if (loading) {
    return (
      <div className="p-4 bg-blue-100 text-blue-700 rounded">
        Loading file content...
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
    <div className="p-4 bg-white rounded shadow">
      <h3 className="text-lg font-medium mb-4">File: {filePath}</h3>
      <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded border">
        {content}
      </pre>
    </div>
  );
};

FileViewer.propTypes = {
  fileWatcher: PropTypes.object,
  filePath: PropTypes.string
};

export default FileViewer;
