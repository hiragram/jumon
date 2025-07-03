/**
 * Error classification for better error handling
 */

export const ErrorTypes = {
  // Config/Lock file related errors
  CONFIG_READ_ERROR: 'CONFIG_READ_ERROR',
  CONFIG_WRITE_ERROR: 'CONFIG_WRITE_ERROR',
  CONFIG_PARSE_ERROR: 'CONFIG_PARSE_ERROR',
  CONFIG_VALIDATION_ERROR: 'CONFIG_VALIDATION_ERROR',
  
  // Network/GitHub related errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  GITHUB_API_ERROR: 'GITHUB_API_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  
  // File system related errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  DISK_SPACE_ERROR: 'DISK_SPACE_ERROR',
  
  // Command/Path related errors
  INVALID_COMMAND_PATH: 'INVALID_COMMAND_PATH',
  COMMAND_NOT_FOUND: 'COMMAND_NOT_FOUND',
  REPOSITORY_NOT_FOUND: 'REPOSITORY_NOT_FOUND',
  
  // Generic errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
};

/**
 * Classifies error based on error message and context
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred
 * @returns {string} Error type from ErrorTypes enum
 */
export function classifyError(error, context = '') {
  const message = error.message.toLowerCase();
  
  // Config/Lock file errors
  if (context.includes('config') || context.includes('lock')) {
    if (message.includes('parse') || message.includes('json')) {
      return ErrorTypes.CONFIG_PARSE_ERROR;
    }
    if (message.includes('enoent') || message.includes('not found')) {
      return ErrorTypes.FILE_NOT_FOUND;
    }
    if (message.includes('permission') || message.includes('eacces')) {
      return ErrorTypes.PERMISSION_ERROR;
    }
    return ErrorTypes.CONFIG_READ_ERROR;
  }
  
  // Network/GitHub errors
  if (context.includes('github') || context.includes('network')) {
    if (message.includes('unauthorized') || message.includes('auth')) {
      return ErrorTypes.AUTHENTICATION_ERROR;
    }
    if (message.includes('network') || message.includes('timeout')) {
      return ErrorTypes.NETWORK_ERROR;
    }
    return ErrorTypes.GITHUB_API_ERROR;
  }
  
  // Command path errors
  if (message.includes('invalid command path')) {
    return ErrorTypes.INVALID_COMMAND_PATH;
  }
  
  // File system errors
  if (message.includes('enoent') || message.includes('not found')) {
    return ErrorTypes.FILE_NOT_FOUND;
  }
  if (message.includes('permission') || message.includes('eacces')) {
    return ErrorTypes.PERMISSION_ERROR;
  }
  if (message.includes('enospc') || message.includes('disk space')) {
    return ErrorTypes.DISK_SPACE_ERROR;
  }
  
  return ErrorTypes.UNKNOWN_ERROR;
}

/**
 * Creates a detailed error object with classification and context
 * @param {Error} originalError - The original error
 * @param {string} context - Context where error occurred
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Detailed error information
 */
export function createDetailedError(originalError, context, metadata = {}) {
  const errorType = classifyError(originalError, context);
  
  return {
    type: errorType,
    message: originalError.message,
    context,
    metadata,
    timestamp: new Date().toISOString(),
    stack: originalError.stack
  };
}