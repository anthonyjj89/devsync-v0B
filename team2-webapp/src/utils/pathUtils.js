import { debugLogger, DEBUG_LEVELS } from './debug';

const COMPONENT = 'pathUtils';

/**
 * Joins path segments, handling empty segments and normalizing separators
 */
export const joinPath = (...segments) => {
  const normalizedSegments = segments
    .filter(Boolean)
    .map(segment => segment.replace(/^\/+|\/+$/g, ''));
  
  const result = normalizedSegments.join('/');
  
  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Joined path segments', {
    segments,
    result
  });
  
  return result;
};

/**
 * Gets the parent directory path
 */
export const getParentPath = (path) => {
  if (!path) return '';
  
  const lastSlashIndex = path.lastIndexOf('/');
  const parentPath = lastSlashIndex === -1 ? '' : path.substring(0, lastSlashIndex);
  
  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Got parent path', {
    path,
    parentPath
  });
  
  return parentPath;
};

/**
 * Gets the file/directory name from a path
 */
export const getBaseName = (path) => {
  if (!path) return '';
  
  const lastSlashIndex = path.lastIndexOf('/');
  const baseName = lastSlashIndex === -1 ? path : path.substring(lastSlashIndex + 1);
  
  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Got base name', {
    path,
    baseName
  });
  
  return baseName;
};

/**
 * Validates a path string
 */
export const validatePath = (path) => {
  if (!path) {
    return {
      isValid: false,
      error: 'Path is required'
    };
  }

  // Check for invalid characters
  const invalidChars = /[<>:"|?*]/g;
  if (invalidChars.test(path)) {
    return {
      isValid: false,
      error: 'Path contains invalid characters'
    };
  }

  // Check for control characters
  if ([...path].some(char => char.charCodeAt(0) < 32)) {
    return {
      isValid: false,
      error: 'Path contains control characters'
    };
  }

  // Check for relative path traversal
  if (path.includes('../') || path.includes('..\\')) {
    return {
      isValid: false,
      error: 'Path cannot contain relative traversal'
    };
  }

  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Validated path', {
    path,
    isValid: true
  });

  return {
    isValid: true,
    error: null
  };
};

/**
 * Normalizes a path string
 */
export const normalizePath = (path) => {
  if (!path) return '';
  
  // Convert backslashes to forward slashes
  let normalized = path.replace(/\\/g, '/');
  
  // Remove multiple consecutive slashes
  normalized = normalized.replace(/\/+/g, '/');
  
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');
  
  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Normalized path', {
    path,
    normalized
  });
  
  return normalized;
};

/**
 * Checks if a path is a subpath of another path
 */
export const isSubPath = (parentPath, childPath) => {
  const normalizedParent = normalizePath(parentPath);
  const normalizedChild = normalizePath(childPath);
  
  const isSubPath = normalizedChild.startsWith(normalizedParent + '/');
  
  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Checked subpath', {
    parentPath,
    childPath,
    isSubPath
  });
  
  return isSubPath;
};

/**
 * Gets the relative path from a base path to a target path
 */
export const getRelativePath = (basePath, targetPath) => {
  const normalizedBase = normalizePath(basePath);
  const normalizedTarget = normalizePath(targetPath);
  
  if (!normalizedTarget.startsWith(normalizedBase)) {
    return targetPath;
  }
  
  const relativePath = normalizedTarget.slice(normalizedBase.length + 1);
  
  debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Got relative path', {
    basePath,
    targetPath,
    relativePath
  });
  
  return relativePath;
};
