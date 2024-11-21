import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'ChatSettings';

const DEFAULT_VSCODE_PATH = 'C:/Users/antho/AppData/Roaming/Code/User/globalStorage/kodu-ai.claude-dev-experimental/tasks';

const ChatSettings = ({ aiType, isOpen, onClose, onSave }) => {
  const [settings, setSettings] = useState({
    basePath: '',
    taskFolder: '',
    advancedMode: false
  });

  useEffect(() => {
    // Load settings from localStorage based on AI type
    const storedSettings = {
      basePath: localStorage.getItem(`${aiType}AI.path`) || DEFAULT_VSCODE_PATH,
      taskFolder: localStorage.getItem(`${aiType}AI.taskFolder`) || '',
      advancedMode: localStorage.getItem(`${aiType}AI.advancedMode`) === 'true'
    };
    setSettings(storedSettings);

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Loaded settings', {
      aiType,
      settings: storedSettings
    });
  }, [aiType]);

  const handleSave = () => {
    // Save settings to localStorage
    localStorage.setItem(`${aiType}AI.path`, settings.basePath);
    localStorage.setItem(`${aiType}AI.taskFolder`, settings.taskFolder);
    localStorage.setItem(`${aiType}AI.advancedMode`, settings.advancedMode);

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Saved settings', {
      aiType,
      settings
    });

    onSave(settings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {aiType === 'kodu' ? 'Kodu' : 'Cline'} AI Settings
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tasks Path
              </label>
              <input
                type="text"
                value={settings.basePath}
                onChange={(e) => setSettings(prev => ({ ...prev, basePath: e.target.value }))}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Enter path to tasks folder"
              />
              <p className="mt-1 text-sm text-gray-500">
                Default: {DEFAULT_VSCODE_PATH}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Folder
              </label>
              <input
                type="text"
                value={settings.taskFolder}
                onChange={(e) => setSettings(prev => ({ ...prev, taskFolder: e.target.value }))}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Enter task folder name"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="advanced-mode"
                checked={settings.advancedMode}
                onChange={(e) => setSettings(prev => ({ ...prev, advancedMode: e.target.checked }))}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="advanced-mode" className="text-sm text-gray-700">
                Enable Advanced Mode
              </label>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:ring-2 focus:ring-blue-500"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

ChatSettings.propTypes = {
  aiType: PropTypes.oneOf(['kodu', 'cline']).isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired
};

export default ChatSettings;
