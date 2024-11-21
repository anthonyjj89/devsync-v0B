import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../../utils/debug';

const COMPONENT = 'DebugPanel';

const DebugPanel = ({ show, onToggle, debugLogs }) => {
  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Rendering DebugPanel', {
    show,
    logsCount: debugLogs.length
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10">
      <div className="bg-gray-100 px-5 py-4 border-t">
        <button 
          onClick={onToggle}
          className={`px-4 py-2 rounded-lg ${
            show ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
          } text-white transition-colors shadow-sm`}
        >
          {show ? 'Hide Debug Panel' : 'Show Debug Panel'}
        </button>

        {show && (
          <div className="mt-3 bg-gray-900 text-white p-4 h-48 overflow-y-auto rounded-lg font-mono text-sm shadow-lg">
            {debugLogs.map((log, index) => (
              <div key={index} className="mb-1 whitespace-pre-wrap">
                [{log.timestamp}] {log.message}
                {log.data && (
                  <pre className="text-xs text-gray-400">{log.data}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

DebugPanel.propTypes = {
  show: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  debugLogs: PropTypes.arrayOf(PropTypes.shape({
    timestamp: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    data: PropTypes.string
  })).isRequired
};

export default DebugPanel;
