import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../../utils/debug';

const COMPONENT = 'AISettings';

const AI_PATHS = {
    kodu: 'C:/Users/antho/AppData/Roaming/Code/User/globalStorage/kodu-ai.claude-dev-experimental/tasks',
    cline: 'C:/Users/antho/AppData/Roaming/Code/User/globalStorage/cline-ai.cline-dev/tasks'
};

const AISettings = ({ aiType, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [config, setConfig] = useState({
    basePath: localStorage.getItem(`${aiType}AI.path`) || AI_PATHS[aiType],
    taskFolder: localStorage.getItem(`${aiType}AI.taskFolder`) || '',
  });
  const [subfolders, setSubfolders] = useState([]);

  useEffect(() => {
    loadSubfolders();
    // Check if we have a saved configuration
    const savedPath = localStorage.getItem(`${aiType}AI.path`);
    const savedFolder = localStorage.getItem(`${aiType}AI.taskFolder`);
    setSaved(!!savedPath && !!savedFolder);
  }, [config.basePath, aiType]);

  const loadSubfolders = async () => {
    if (!config.basePath) return;

    setLoading(true);
    setError('');
    
    try {
      const encodedPath = encodeURIComponent(config.basePath);
      const response = await fetch(`http://localhost:3002/api/get-subfolders?path=${encodedPath}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.entries)) {
        setSubfolders(data.entries);
        debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Loaded subfolders', {
          path: config.basePath,
          aiType,
          folderCount: data.entries.length
        });
      } else {
        throw new Error(data.error || 'Failed to load subfolders');
      }
    } catch (err) {
      setError(`Failed to load subfolders: ${err.message}`);
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error loading subfolders', {
        error: err.message,
        aiType
      });
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
      setSaved(true);
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Settings saved successfully', {
        config,
        aiType
      });
    } catch (err) {
      setError(err.message);
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error saving settings', {
        error: err.message,
        aiType
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDev = () => {
    // Navigate to the dev interface
    window.location.href = `/${aiType === 'kodu' ? 'kodu' : 'cline'}/dev`;
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
            onChange={(e) => {
              setConfig(prev => ({ ...prev, basePath: e.target.value }));
              setSaved(false);
            }}
            disabled={loading}
          />
          <p className="mt-1 text-sm text-gray-500">
            Default path: {AI_PATHS[aiType]}
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
            onChange={(e) => {
              setConfig(prev => ({ ...prev, taskFolder: e.target.value }));
              setSaved(false);
            }}
            disabled={loading || subfolders.length === 0}
          >
            <option value="">Select a folder</option>
            {subfolders.map(folder => (
              <option key={folder} value={folder}>{folder}</option>
            ))}
          </select>
          {loading && (
            <p className="mt-1 text-sm text-gray-500">
              Loading folders...
            </p>
          )}
          {!loading && subfolders.length === 0 && (
            <p className="mt-1 text-sm text-red-500">
              No folders found in the specified path
            </p>
          )}
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !config.basePath || !config.taskFolder}
          >
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
          
          {saved && (
            <button
              onClick={handleGoToDev}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:ring-2 focus:ring-green-500 transition-colors flex items-center gap-2"
            >
              Go to Dev
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
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
