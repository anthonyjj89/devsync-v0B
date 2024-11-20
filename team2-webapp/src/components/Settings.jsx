import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';
import FileWatcher from '../services/fileWatcher';

const COMPONENT = 'Settings';

const Settings = ({ onSave }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    koduPath: localStorage.getItem('koduAI.path') || 'C:\\Users\\antho\\AppData\\Roaming\\Code\\User\\globalStorage\\kodu-ai.claude-dev-experimental\\tasks',
    clinePath: localStorage.getItem('clineAI.path') || 'C:\\Users\\antho\\AppData\\Roaming\\Code\\User\\globalStorage\\saoudrizwan.claude-dev\\tasks',
    koduTaskFolder: localStorage.getItem('koduAI.taskFolder') || '',
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
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Settings component mounted', {
      initialConfig: config
    });
    loadSubfolders();
  }, [config.koduPath, config.clinePath]);

  const loadSubfolders = async () => {
    setLoading(true);
    setError('');
    const fileWatcher = new FileWatcher(() => {});

    try {
      // Load Kodu subfolders
      if (config.koduPath) {
        fileWatcher.setBasePath(config.koduPath);
        const koduFolders = await fileWatcher.getSubfolders();
        setKoduSubfolders(koduFolders);
      }

      // Load Cline subfolders
      if (config.clinePath) {
        fileWatcher.setBasePath(config.clinePath);
        const clineFolders = await fileWatcher.getSubfolders();
        setClineSubfolders(clineFolders);
      }
    } catch (error) {
      setError('Failed to load folders. Please check the paths and permissions.');
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error loading subfolders', { error });
    } finally {
      setLoading(false);
    }
  };

  const validateConfig = async () => {
    const fileWatcher = new FileWatcher(() => {});
    
    try {
      // Validate Kodu AI if enabled
      if (config.enabledAIs.kodu) {
        if (!config.koduPath || !config.koduTaskFolder) {
          throw new Error('Kodu AI requires both path and task folder to be set');
        }
        fileWatcher.setBasePath(config.koduPath, config.koduTaskFolder);
        await fileWatcher.validatePath();
      }

      // Validate Cline AI if enabled
      if (config.enabledAIs.cline) {
        if (!config.clinePath || !config.clineTaskFolder) {
          throw new Error('Cline AI requires both path and task folder to be set');
        }
        fileWatcher.setBasePath(config.clinePath, config.clineTaskFolder);
        await fileWatcher.validatePath();
      }

      // Validate project path
      if (config.projectPath) {
        fileWatcher.setProjectPath(config.projectPath);
        await fileWatcher.validateProjectPath();
      } else {
        throw new Error('Project folder path is required');
      }

      return true;
    } catch (error) {
      throw new Error(`Configuration validation failed: ${error.message}`);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      await validateConfig();

      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Saving configuration', {
        config
      });

      // Save to localStorage with namespaced keys
      localStorage.setItem('koduAI.path', config.koduPath);
      localStorage.setItem('clineAI.path', config.clinePath);
      localStorage.setItem('koduAI.taskFolder', config.koduTaskFolder);
      localStorage.setItem('clineAI.taskFolder', config.clineTaskFolder);
      localStorage.setItem('koduAI.enabled', config.enabledAIs.kodu);
      localStorage.setItem('clineAI.enabled', config.enabledAIs.cline);
      localStorage.setItem('project.path', config.projectPath);

      onSave(config);
    } catch (error) {
      setError(error.message);
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error saving settings', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const defaultConfig = {
      koduPath: 'C:\\Users\\antho\\AppData\\Roaming\\Code\\User\\globalStorage\\kodu-ai.claude-dev-experimental\\tasks',
      clinePath: 'C:\\Users\\antho\\AppData\\Roaming\\Code\\User\\globalStorage\\saoudrizwan.claude-dev\\tasks',
      koduTaskFolder: '',
      clineTaskFolder: '',
      projectPath: '',
      enabledAIs: {
        kodu: true,
        cline: true
      }
    };

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Resetting to defaults', {
      defaultConfig
    });

    setConfig(defaultConfig);
    setError('');
  };

  const handleAIToggle = (ai) => {
    const newEnabledAIs = {
      ...config.enabledAIs,
      [ai]: !config.enabledAIs[ai]
    };

    // Ensure at least one AI is enabled
    if (!newEnabledAIs.kodu && !newEnabledAIs.cline) {
      setError('At least one AI must be enabled');
      debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Attempted to disable all AIs');
      return;
    }

    setConfig(prev => ({
      ...prev,
      enabledAIs: newEnabledAIs
    }));
    setError('');
  };

  const saveToFile = () => {
    try {
      const configData = JSON.stringify(config, null, 2);
      const blob = new Blob([configData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'project.devsync';
      link.click();
      URL.revokeObjectURL(url);
      setError('');
    } catch (error) {
      setError('Failed to save configuration file');
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error saving to file', { error });
    }
  };

  const loadFromFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const loadedConfig = JSON.parse(e.target.result);
        
        // Validate the loaded configuration
        setConfig(loadedConfig);
        await loadSubfolders(); // Reload subfolders for the new paths
        setError('');
      } catch (error) {
        setError('Failed to load configuration file. Please check the file format.');
        debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error loading config file', { error });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold mb-4">Project Settings</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {loading && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">Loading...</span>
        </div>
      )}

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

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
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
  );
};

Settings.propTypes = {
  onSave: PropTypes.func.isRequired
};

export default Settings;
