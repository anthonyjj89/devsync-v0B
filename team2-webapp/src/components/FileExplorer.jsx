import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';
import FileViewer from './FileViewer';
import FileList from './file/FileList';
import useFileNavigation from '../hooks/useFileNavigation';

const COMPONENT = 'FileExplorer';

const FileExplorer = ({ fileWatcher, initialFile, initialVersion }) => {
  const {
    selectedFile,
    currentPath,
    entries,
    error,
    loading,
    watcherPath,
    loadEntries,
    handleEntryClick,
    handleBackClick,
    handleProjectPathChange
  } = useFileNavigation({
    fileWatcher,
    initialFile
  });

  // Update watcherPath when fileWatcher.projectPath changes
  useEffect(() => {
    if (fileWatcher?.projectPath !== watcherPath) {
      handleProjectPathChange(fileWatcher?.projectPath);
    }
  }, [fileWatcher?.projectPath, watcherPath, handleProjectPathChange]);

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
        handleProjectPathChange(initialFile.substring(0, lastSlashIndex));
      }
    }
  }, [initialFile, handleProjectPathChange]);

  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Rendering FileExplorer', {
    hasFileWatcher: !!fileWatcher,
    initialFile,
    currentPath,
    entriesCount: entries.length,
    selectedFile
  });

  if (!fileWatcher?.projectPath) {
    return (
      <div className="p-4 bg-yellow-100 text-yellow-700 rounded">
        Please configure a project path in settings.
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* File List */}
      <FileList
        currentPath={currentPath}
        entries={entries}
        selectedFile={selectedFile}
        loading={loading}
        error={error}
        onEntryClick={handleEntryClick}
        onBackClick={handleBackClick}
        onRefresh={loadEntries}
      />

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
