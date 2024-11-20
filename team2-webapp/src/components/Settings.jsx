import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'Settings';

const Settings = ({ onSave }) => {
  const [paths, setPaths] = useState({
    kodu: localStorage.getItem('koduPath') || 'C:\\Users\\antho\\AppData\\Roaming\\Code\\User\\globalStorage\\kodu-ai.claude-dev-experimental\\tasks',
    cline: localStorage.getItem('clinePath') || 'C:\\Users\\antho\\AppData\\Roaming\\Code\\User\\globalStorage\\saoudrizwan.claude-dev\\tasks'
  });

  useEffect(() => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Settings component mounted', {
      initialPaths: paths
    });
  }, []);

  const handleSave = () => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Saving paths', {
      paths
    });

    localStorage.setItem('koduPath', paths.kodu);
    localStorage.setItem('clinePath', paths.cline);
    onSave(paths);
  };

  const handleReset = () => {
    const defaultPaths = {
      kodu: 'C:\\Users\\antho\\AppData\\Roaming\\Code\\User\\globalStorage\\kodu-ai.claude-dev-experimental\\tasks',
      cline: 'C:\\Users\\antho\\AppData\\Roaming\\Code\\User\\globalStorage\\saoudrizwan.claude-dev\\tasks'
    };

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Resetting paths to defaults', {
      defaultPaths
    });

    setPaths(defaultPaths);
    localStorage.setItem('koduPath', defaultPaths.kodu);
    localStorage.setItem('clinePath', defaultPaths.cline);
    onSave(defaultPaths);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Settings</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="kodu-path" className="block text-sm font-medium text-gray-700 mb-1">
            Kodu AI Path:
          </label>
          <input
            type="text"
            id="kodu-path"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            value={paths.kodu}
            onChange={(e) => setPaths(prev => ({ ...prev, kodu: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="cline-path" className="block text-sm font-medium text-gray-700 mb-1">
            Cline AI Path:
          </label>
          <input
            type="text"
            id="cline-path"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            value={paths.cline}
            onChange={(e) => setPaths(prev => ({ ...prev, cline: e.target.value }))}
          />
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:ring-2 focus:ring-blue-500"
          >
            Save Changes
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:ring-2 focus:ring-gray-500"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

Settings.propTypes = {
  onSave: PropTypes.func.isRequired
};

export default Settings;
