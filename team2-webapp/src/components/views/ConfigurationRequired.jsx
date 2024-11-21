import PropTypes from 'prop-types';

const ConfigurationRequired = ({ aiType, onShowDebug }) => {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Configuration Required</h2>
        <p className="text-gray-600 mb-4">
          Please configure both the path and task folder for {aiType === 'kodu' ? 'Kodu' : 'Cline'} AI in settings.
        </p>
        <button
          onClick={onShowDebug}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Show Debug Panel
        </button>
      </div>
    </div>
  );
};

ConfigurationRequired.propTypes = {
  aiType: PropTypes.oneOf(['kodu', 'cline']).isRequired,
  onShowDebug: PropTypes.func.isRequired
};

export default ConfigurationRequired;
