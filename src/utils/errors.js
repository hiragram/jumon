/**
 * Centralized error handling utilities
 */

/**
 * Standard error handler for command operations
 * @param {Error} error - The error to handle
 * @param {string} context - Context where the error occurred
 * @param {boolean} exitProcess - Whether to exit the process after logging
 */
export function handleCommandError(error, context = 'Operation', exitProcess = true) {
  const message = error?.message || 'Unknown error occurred';
  console.error(`Error in ${context}: ${message}`);
  
  if (exitProcess) {
    process.exit(1);
  }
}

/**
 * Logs a warning message with consistent formatting
 * @param {string} message - Warning message to log
 * @param {string} context - Context where the warning occurred
 */
export function logWarning(message, context = '') {
  const prefix = context ? `[${context}] ` : '';
  console.warn(`⚠️  ${prefix}${message}`);
}

/**
 * Logs an error message without exiting the process
 * @param {string} message - Error message to log
 * @param {string} context - Context where the error occurred
 */
export function logError(message, context = '') {
  const prefix = context ? `[${context}] ` : '';
  console.error(`✗ ${prefix}${message}`);
}

/**
 * Logs a success message with consistent formatting
 * @param {string} message - Success message to log
 * @param {string} context - Context where the success occurred
 */
export function logSuccess(message, context = '') {
  const prefix = context ? `[${context}] ` : '';
  console.log(`✓ ${prefix}${message}`);
}

/**
 * Wraps an async function with error handling
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context for error reporting
 * @returns {Function} Wrapped function with error handling
 */
export function withErrorHandling(fn, context) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleCommandError(error, context);
    }
  };
}