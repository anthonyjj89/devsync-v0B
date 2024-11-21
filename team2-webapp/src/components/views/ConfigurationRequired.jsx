import PropTypes from 'prop-types';
import AISettings from '../ai/AISettings';
import { debugLogger, DEBUG_LEVELS } from '../../utils/debug';

const COMPONENT = 'ConfigurationRequired';

const ConfigurationRequired = ({ aiType, onShowDebug }) => {
  const handleSave = async (config) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'AI settings saved', {
      aiType,
      config
    });
    // The AISettings component will handle the actual saving
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white shadow-sm mb-4">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h2 className="text-xl font-semibold">Configuration Required</h2>
          <p className="text-gray-600 mt-2">
            Please configure the path and task folder for {aiType === 'kodu' ? 'Kodu' : 'Cline'} AI below.
          </p>
          <button
            onClick={onShowDebug}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Show Debug Panel
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <AISettings aiType={aiType} onSave={handleSave} />
        </div>
      </div>
    </div>
  );
};

ConfigurationRequired.propTypes = {
  aiType: PropTypes.oneOf(['kodu', 'cline']).isRequired,
  onShowDebug: PropTypes.func.isRequired
};

export default ConfigurationRequired;
