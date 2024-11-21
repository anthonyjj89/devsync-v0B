import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';
import FileWatcher from '../services/fileWatcher';

const COMPONENT = 'Settings';

// Default VSCode extension path
const DEFAULT_VSCODE_PATH = 'C:/Users/antho/AppData/Roaming/Code/User/globalStorage/kodu-ai.claude-dev-experimental/tasks';

const Settings = ({ onSave }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState({
    koduPath: localStorage.getItem('koduAI.path') || DEFAULT_VSCODE_PATH,
    koduTaskFolder: localStorage.getItem('koduAI.taskFolder') || '',
    clinePath: localStorage.getItem('clineAI.path') || DEFAULT_VSCODE_PATH,
    clineTaskFolder: localStorage.getItem('clineAI.taskFolder') || '',
    projectPath: localStorage.getItem('project.path') || '',
    enabledAIs: {
      kodu: localStorage.getItem('koduAI.enabled') !== 'false',
      cline: localStorage.getItem('clineAI.enabled') !== 'false'
    }
  });
  const [koduSubfolders, setKoduSubfolders] = useState([]);
  const [clineSubfolders, setClineSubfolders] = useState([]);

  useEffect(() => {
    loadSubfolders();
  }, [config.koduPath, config.clinePath]);

  const loadSubfolders = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (config.koduPath) {
        const koduWatcher = new FileWatcher();
        koduWatcher.setProjectPath(config.koduPath);
        const koduResult = await koduWatcher.getSubfolders();
        if (koduResult.success && Array.isArray(koduResult.entries)) {
          // Filter for directories only and extract names
          const folders = koduResult.entries
            .filter(entry => entry.type === 'directory')
            .map(entry => entry.name);
          setKoduSubfolders(folders);
          debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Loaded Kodu subfolders', {
            path: config.koduPath,
            folderCount: folders.length
          });
        } else {
          throw new Error(koduResult.error || 'Failed to load Kodu subfolders');
        }
      }

      if (config.clinePath) {
        const clineWatcher = new FileWatcher();
        clineWatcher.setProjectPath(config.clinePath);
        const clineResult = await clineWatcher.getSubfolders();
        if (clineResult.success && Array.isArray(clineResult.entries)) {
          // Filter for directories only and extract names
          const folders = clineResult.entries
            .filter(entry => entry.type === 'directory')
            .map(entry => entry.name);
          setClineSubfolders(folders);
          debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Loaded Cline subfolders', {
            path: config.clinePath,
            folderCount: folders.length
          });
        } else {
          throw new Error(clineResult.error || 'Failed to load Cline subfolders');
        }
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
      // Validate paths
      if (!config.projectPath) {
        throw new Error('Project path is required');
      }

      if (config.enabledAIs.kodu && (!config.koduPath || !config.koduTaskFolder)) {
        throw new Error('Kodu AI path and task folder are required when enabled');
      }

      if (config.enabledAIs.cline && (!config.clinePath || !config.clineTaskFolder)) {
        throw new Error('Cline AI path and task folder are required when enabled');
      }

      // Save to localStorage
      localStorage.setItem('project.path', config.projectPath);
      localStorage.setItem('koduAI.path', config.koduPath);
      localStorage.setItem('koduAI.taskFolder', config.koduTaskFolder);
      localStorage.setItem('koduAI.enabled', config.enabledAIs.kodu);
      localStorage.setItem('clineAI.path', config.clinePath);
      localStorage.setItem('clineAI.taskFolder', config.clineTaskFolder);
      localStorage.setItem('clineAI.enabled', config.enabledAIs.cline);

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

  const handleReset = () => {
    setConfig({
      koduPath: DEFAULT_VSCODE_PATH,
      koduTaskFolder: '',
      clinePath: DEFAULT_VSCODE_PATH,
      clineTaskFolder: '',
      projectPath: '',
      enabledAIs: {
        kodu: true,
        cline: false
      }
    });
    setError('');
  };

  const saveToFile = () => {
    const configData = JSON.stringify(config, null, 2);
    const blob = new Blob([configData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'devsync-settings.devsync';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadFromFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const loadedConfig = JSON.parse(e.target.result);
        setConfig(loadedConfig);
      } catch (err) {
        setError('Failed to load settings file: Invalid format');
      }
    };
    reader.readAsText(file);
  };

  const handleAIToggle = (ai) => {
    setConfig(prev => ({
      ...prev,
      enabledAIs: {
        ...prev.enabledAIs,
        [ai]: !prev.enabledAIs[ai]
      }
    }));
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Fixed header with action buttons */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Project Settings</h2>
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                Reset to Defaults
              </button>
              <button
                onClick={saveToFile}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                Export Settings
              </button>
              <label className={`px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 focus:ring-2 focus:ring-purple-500 cursor-pointer transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                Import Settings
                <input
                  type="file"
                  accept=".devsync"
                  onChange={loadFromFile}
                  className="hidden"
                  disabled={loading}
                />
              </label>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {loading && (
            <div className="mt-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          {/* Project Folder Section */}
          <div className="bg-green-50 rounded-lg shadow p-6 border-l-4 border-green-500">
            <h3 className="text-lg font-medium mb-4 text-green-800">Project Folder Settings</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="project-path" className="block text-sm font-medium text-green-900 mb-1">
                  Project Folder Path:
                </label>
                <input
                  type="text"
                  id="project-path"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500"
                  value={config.projectPath}
                  onChange={(e) => setConfig(prev => ({ ...prev, projectPath: e.target.value }))}
                  disabled={loading}
                  placeholder="Enter the path to your project folder"
                />
                <p className="mt-1 text-sm text-green-600">
                  This path will be used to monitor and display project file contents
                </p>
              </div>
            </div>
          </div>

          {/* Kodu AI Section */}
          <div className="bg-blue-50 rounded-lg shadow p-6 border-l-4 border-blue-500">
            <h3 className="text-lg font-medium mb-4 text-blue-800">Kodu AI Settings</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.enabledAIs.kodu}
                  onChange={() => handleAIToggle('kodu')}
                  className="w-4 h-4 text-blue-600"
                  disabled={loading}
                />
                <span className="text-blue-900">Enable Kodu AI</span>
              </label>

              <div>
                <label htmlFor="kodu-path" className="block text-sm font-medium text-blue-900 mb-1">
                  Tasks Path:
                </label>
                <input
                  type="text"
                  id="kodu-path"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  value={config.koduPath}
                  onChange={(e) => setConfig(prev => ({ ...prev, koduPath: e.target.value }))}
                  disabled={loading}
                />
                <p className="mt-1 text-sm text-blue-600">
                  Default path: {DEFAULT_VSCODE_PATH}
                </p>
              </div>

              <div>
                <label htmlFor="kodu-task-folder" className="block text-sm font-medium text-blue-900 mb-1">
                  Select Task Folder:
                </label>
                <select
                  id="kodu-task-folder"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  value={config.koduTaskFolder}
                  onChange={(e) => setConfig(prev => ({ ...prev, koduTaskFolder: e.target.value }))}
                  disabled={loading || koduSubfolders.length === 0}
                >
                  <option value="">Select a folder</option>
                  {koduSubfolders.map(folder => (
                    <option key={folder} value={folder}>{folder}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Cline AI Section */}
          <div className="bg-purple-50 rounded-lg shadow p-6 border-l-4 border-purple-500">
            <h3 className="text-lg font-medium mb-4 text-purple-800">Cline AI Settings</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.enabledAIs.cline}
                  onChange={() => handleAIToggle('cline')}
                  className="w-4 h-4 text-purple-600"
                  disabled={loading}
                />
                <span className="text-purple-900">Enable Cline AI</span>
              </label>

              <div>
                <label htmlFor="cline-path" className="block text-sm font-medium text-purple-900 mb-1">
                  Tasks Path:
                </label>
                <input
                  type="text"
                  id="cline-path"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500"
                  value={config.clinePath}
                  onChange={(e) => setConfig(prev => ({ ...prev, clinePath: e.target.value }))}
                  disabled={loading}
                />
                <p className="mt-1 text-sm text-purple-600">
                  Default path: {DEFAULT_VSCODE_PATH}
                </p>
              </div>

              <div>
                <label htmlFor="cline-task-folder" className="block text-sm font-medium text-purple-900 mb-1">
                  Select Task Folder:
                </label>
                <select
                  id="cline-task-folder"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500"
                  value={config.clineTaskFolder}
                  onChange={(e) => setConfig(prev => ({ ...prev, clineTaskFolder: e.target.value }))}
                  disabled={loading || clineSubfolders.length === 0}
                >
                  <option value="">Select a folder</option>
                  {clineSubfolders.map(folder => (
                    <option key={folder} value={folder}>{folder}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Settings.propTypes = {
  onSave: PropTypes.func.isRequired
};

export default Settings;
