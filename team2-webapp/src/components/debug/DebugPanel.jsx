import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../../utils/debug';

const COMPONENT = 'DebugPanel';

const getLevelColor = (message) => {
  if (message.includes('[ERROR]')) return 'text-red-500';
  if (message.includes('[WARN]')) return 'text-yellow-500';
  if (message.includes('[INFO]')) return 'text-blue-500';
  if (message.includes('[PERF]')) return 'text-purple-500';
  return 'text-gray-300';
};

const DebugPanel = ({ show, onToggle, debugLogs, onClear }) => {
  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Rendering DebugPanel', {
    show,
    logsCount: debugLogs.length
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-gray-100 px-5 py-4 border-t">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button 
              onClick={onToggle}
              className={`px-4 py-2 rounded-lg ${
                show ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
              } text-white transition-colors shadow-sm`}
            >
              {show ? 'Hide Debug Panel' : 'Show Debug Panel'}
            </button>
            {show && (
              <button 
                onClick={onClear}
                className="px-4 py-2 rounded-lg bg-gray-500 hover:bg-gray-600 text-white transition-colors shadow-sm"
              >
                Clear Logs
              </button>
            )}
          </div>
          {show && (
            <div className="text-sm text-gray-600">
              {debugLogs.length} logs
            </div>
          )}
        </div>

        {show && (
          <div className="mt-3 bg-gray-900 text-white p-4 h-96 overflow-y-auto rounded-lg font-mono text-sm shadow-lg">
            {debugLogs.length === 0 ? (
              <div className="text-gray-500 text-center">No logs to display</div>
            ) : (
              debugLogs.map((log, index) => (
                <div key={index} className="mb-2">
                  <div className={`${getLevelColor(log.message)} whitespace-pre-wrap`}>
                    <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                  </div>
                  {log.data && (
                    <pre className="text-xs text-gray-400 ml-4 mt-1 overflow-x-auto">
                      {log.data}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

DebugPanel.propTypes = {
  show: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  debugLogs: PropTypes.arrayOf(PropTypes.shape({
    timestamp: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    data: PropTypes.string
  })).isRequired
};

export default DebugPanel;
