import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../../utils/debug';
import FileWatcher from '../../services/fileWatcher';

const COMPONENT = 'AISettings';

// Default VSCode extension path
const DEFAULT_VSCODE_PATH = 'C:/Users/antho/AppData/Roaming/Code/User/globalStorage/kodu-ai.claude-dev-experimental/tasks';

const AISettings = ({ aiType, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState({
    basePath: localStorage.getItem(`${aiType}AI.path`) || DEFAULT_VSCODE_PATH,
    taskFolder: localStorage.getItem(`${aiType}AI.taskFolder`) || '',
  });
  const [subfolders, setSubfolders] = useState([]);

  useEffect(() => {
    loadSubfolders();
  }, [config.basePath]);

  const loadSubfolders = async () => {
    if (!config.basePath) return;

    setLoading(true);
    setError('');
    
    try {
      const watcher = new FileWatcher();
      watcher.setProjectPath(config.basePath);
      const result = await watcher.getSubfolders();
      
      if (result.success && Array.isArray(result.entries)) {
        const folders = result.entries
          .filter(entry => entry.type === 'directory')
          .map(entry => entry.name);
        setSubfolders(folders);
        debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Loaded subfolders', {
          path: config.basePath,
          folderCount: folders.length
        });
      } else {
        throw new Error(result.error || 'Failed to load subfolders');
      }
    } catch (err) {
      setError(`Failed to load subfolders: ${err.message}`);
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error loading subfolders', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      if (!config.basePath || !config.taskFolder) {
        throw new Error('Both path and task folder are required');
      }

      // Save to localStorage
      localStorage.setItem(`${aiType}AI.path`, config.basePath);
      localStorage.setItem(`${aiType}AI.taskFolder`, config.taskFolder);

      // Call parent save handler
      await onSave(config);
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Settings saved successfully', config);
    } catch (err) {
      setError(err.message);
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error saving settings', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-4">Configure {aiType === 'kodu' ? 'Kodu' : 'Cline'} AI</h3>
      
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="base-path" className="block text-sm font-medium text-gray-700 mb-1">
            Tasks Path:
          </label>
          <input
            type="text"
            id="base-path"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            value={config.basePath}
            onChange={(e) => setConfig(prev => ({ ...prev, basePath: e.target.value }))}
            disabled={loading}
          />
          <p className="mt-1 text-sm text-gray-500">
            Default path: {DEFAULT_VSCODE_PATH}
          </p>
        </div>

        <div>
          <label htmlFor="task-folder" className="block text-sm font-medium text-gray-700 mb-1">
            Select Task Folder:
          </label>
          <select
            id="task-folder"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            value={config.taskFolder}
            onChange={(e) => setConfig(prev => ({ ...prev, taskFolder: e.target.value }))}
            disabled={loading || subfolders.length === 0}
          >
            <option value="">Select a folder</option>
            {subfolders.map(folder => (
              <option key={folder} value={folder}>{folder}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

AISettings.propTypes = {
  aiType: PropTypes.oneOf(['kodu', 'cline']).isRequired,
  onSave: PropTypes.func.isRequired
};

export default AISettings;
