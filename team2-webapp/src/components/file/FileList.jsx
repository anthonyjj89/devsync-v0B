import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../../utils/debug';

const COMPONENT = 'FileList';

const FileList = ({
  currentPath,
  entries,
  selectedFile,
  loading,
  error,
  onEntryClick,
  onBackClick,
  onRefresh
}) => {
  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Rendering FileList', {
    currentPath,
    entriesCount: entries.length,
    selectedFile,
    loading,
    hasError: !!error
  });

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
    <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Project Files</h3>
          <button
            onClick={onRefresh}
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
            onClick={onBackClick}
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
            onClick={() => onEntryClick(entry)}
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
  );
};

FileList.propTypes = {
  currentPath: PropTypes.string.isRequired,
  entries: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['directory', 'file']).isRequired
  })).isRequired,
  selectedFile: PropTypes.string,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onEntryClick: PropTypes.func.isRequired,
  onBackClick: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired
};

export default FileList;
