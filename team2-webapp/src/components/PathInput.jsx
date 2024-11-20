import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'PathInput';

const PathInput = ({ onPathValidated }) => {
  const [path, setPath] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    const validationId = `path-validation-${Date.now()}`;
    debugLogger.startTimer(validationId);
    
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Starting path validation', {
      path
    });

    setIsValidating(true);

    try {
      await onPathValidated(path);
      
      const duration = debugLogger.endTimer(validationId, COMPONENT);
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Path validation successful', {
        path,
        durationMs: duration
      });
    } catch (error) {
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Path validation failed', {
        path,
        error: error.message
      });
    } finally {
      setIsValidating(false);
    }
  }, [path, onPathValidated]);

  const handlePathChange = useCallback((e) => {
    const newPath = e.target.value;
    debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Path input changed', {
      previousPath: path,
      newPath
    });
    setPath(newPath);
  }, [path]);

  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Rendering PathInput', {
    currentPath: path,
    isValidating
  });

  return (
    <div className="mb-5">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={path}
          onChange={handlePathChange}
          placeholder="Enter path to JSON files"
          className={`
            flex-1
            px-4 
            py-2 
            rounded-md 
            border 
            border-gray-300
            text-sm
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
            focus:border-transparent
            disabled:bg-gray-100
            disabled:cursor-not-allowed
          `}
          disabled={isValidating}
        />
        <button 
          type="submit" 
          className={`
            px-4 
            py-2 
            rounded-md 
            bg-blue-500 
            text-white
            text-sm
            font-medium
            transition-colors
            ${isValidating || !path.trim() 
              ? 'opacity-70 cursor-not-allowed' 
              : 'hover:bg-blue-600'}
          `}
          disabled={isValidating || !path.trim()}
        >
          {isValidating ? 'Validating...' : 'Monitor Path'}
        </button>
      </form>
    </div>
  );
};

PathInput.propTypes = {
  onPathValidated: PropTypes.func.isRequired
};

export default PathInput;
