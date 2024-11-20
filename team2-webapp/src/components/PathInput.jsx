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
      // Call the validation callback
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

  const containerStyle = {
    marginBottom: '20px'
  };

  const formStyle = {
    display: 'flex',
    gap: '10px'
  };

  const inputStyle = {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '14px'
  };

  const buttonStyle = {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: isValidating ? 'wait' : 'pointer',
    opacity: isValidating ? 0.7 : 1
  };

  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Rendering PathInput', {
    currentPath: path,
    isValidating
  });

  return (
    <div style={containerStyle}>
      <form onSubmit={handleSubmit} style={formStyle}>
        <input
          type="text"
          value={path}
          onChange={handlePathChange}
          placeholder="Enter path to JSON files"
          style={inputStyle}
          disabled={isValidating}
        />
        <button 
          type="submit" 
          style={buttonStyle}
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
