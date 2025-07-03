/**
 * Unified error handling for command operations
 * Provides consistent error context and recovery information
 */

import { ErrorTypes } from './error-types.js';

export class CommandError extends Error {
  constructor(message, type = ErrorTypes.GENERAL_ERROR, context = {}, cause = null) {
    super(message);
    this.name = 'CommandError';
    this.type = type;
    this.context = context;
    this.cause = cause;
    this.timestamp = new Date().toISOString();
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CommandError);
    }
  }

  /**
   * Create a CommandError from an existing error
   */
  static fromError(error, type = ErrorTypes.GENERAL_ERROR, context = {}) {
    const message = error.message || 'Unknown error occurred';
    return new CommandError(message, type, context, error);
  }

  /**
   * Create a config-related error
   */
  static configError(message, context = {}) {
    return new CommandError(message, ErrorTypes.CONFIG_READ_ERROR, context);
  }

  /**
   * Create a filesystem-related error
   */
  static fileError(message, context = {}) {
    return new CommandError(message, ErrorTypes.FILE_NOT_FOUND, context);
  }

  /**
   * Create a network-related error
   */
  static networkError(message, context = {}) {
    return new CommandError(message, ErrorTypes.NETWORK_ERROR, context);
  }

  /**
   * Create a validation error
   */
  static validationError(message, context = {}) {
    return new CommandError(message, ErrorTypes.VALIDATION_ERROR, context);
  }

  /**
   * Create a permission error
   */
  static permissionError(message, context = {}) {
    return new CommandError(message, ErrorTypes.PERMISSION_ERROR, context);
  }

  /**
   * Get a user-friendly error message with context
   */
  getFormattedMessage() {
    const contextStr = Object.keys(this.context).length > 0 
      ? ` (Context: ${JSON.stringify(this.context)})` 
      : '';
    
    return `${this.message}${contextStr}`;
  }

  /**
   * Get recovery suggestions based on error type
   */
  getRecoverySuggestions() {
    switch (this.type) {
      case ErrorTypes.CONFIG_READ_ERROR:
        return [
          'Check if cccsc.json exists and is readable',
          'Verify the JSON syntax is valid',
          'Ensure proper file permissions'
        ];
      
      case ErrorTypes.CONFIG_PARSE_ERROR:
        return [
          'Validate JSON syntax in cccsc.json',
          'Check for trailing commas or quotes',
          'Use a JSON validator tool'
        ];
      
      case ErrorTypes.FILE_NOT_FOUND:
        return [
          'Verify the file path exists',
          'Check if the file was moved or deleted',
          'Ensure proper directory structure'
        ];
      
      case ErrorTypes.PERMISSION_ERROR:
        return [
          'Check file/directory permissions',
          'Run with appropriate privileges',
          'Verify ownership of files'
        ];
      
      case ErrorTypes.NETWORK_ERROR:
        return [
          'Check internet connection',
          'Verify repository URL and access',
          'Try again later if service is down'
        ];
      
      case ErrorTypes.VALIDATION_ERROR:
        return [
          'Check input parameters',
          'Verify data format requirements',
          'Ensure all required fields are provided'
        ];
      
      case ErrorTypes.DEPENDENCY_ERROR:
        return [
          'Check if required dependencies are installed',
          'Verify dependency versions',
          'Run npm install to update dependencies'
        ];
      
      default:
        return [
          'Review error message for specific details',
          'Check system logs for additional information',
          'Consider filing an issue if problem persists'
        ];
    }
  }

  /**
   * Convert to a plain object for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Enhanced error handling function with CommandError support
 */
export function handleCommandError(error, operation = 'Operation') {
  let commandError;
  
  if (error instanceof CommandError) {
    commandError = error;
  } else {
    commandError = CommandError.fromError(error, ErrorTypes.GENERAL_ERROR, { operation });
  }
  
  console.error(`❌ ${operation} failed: ${commandError.getFormattedMessage()}`);
  
  const suggestions = commandError.getRecoverySuggestions();
  if (suggestions.length > 0) {
    console.error('\n💡 Recovery suggestions:');
    suggestions.forEach(suggestion => {
      console.error(`  • ${suggestion}`);
    });
  }
  
  // Log detailed error for debugging
  console.error('\nDetailed error:', commandError.toJSON());
  
  process.exit(1);
}