import { describe, test, expect } from 'vitest';
import { ErrorTypes, classifyError, createDetailedError } from '../../src/utils/error-types.js';

describe('Error Types', () => {
  describe('classifyError', () => {
    test('should classify config errors correctly', () => {
      const parseError = new Error('Unexpected token in JSON');
      expect(classifyError(parseError, 'config')).toBe(ErrorTypes.CONFIG_PARSE_ERROR);
      
      const notFoundError = new Error('ENOENT: no such file');
      expect(classifyError(notFoundError, 'config')).toBe(ErrorTypes.FILE_NOT_FOUND);
      
      const permissionError = new Error('EACCES: permission denied');
      expect(classifyError(permissionError, 'config')).toBe(ErrorTypes.PERMISSION_ERROR);
    });
    
    test('should classify GitHub errors correctly', () => {
      const authError = new Error('Unauthorized');
      expect(classifyError(authError, 'github')).toBe(ErrorTypes.AUTHENTICATION_ERROR);
      
      const networkError = new Error('Network timeout');
      expect(classifyError(networkError, 'network')).toBe(ErrorTypes.NETWORK_ERROR);
    });
    
    test('should classify command path errors correctly', () => {
      const pathError = new Error('Invalid command path');
      expect(classifyError(pathError)).toBe(ErrorTypes.INVALID_COMMAND_PATH);
    });
    
    test('should return UNKNOWN_ERROR for unclassified errors', () => {
      const unknownError = new Error('Some random error');
      expect(classifyError(unknownError)).toBe(ErrorTypes.UNKNOWN_ERROR);
    });
  });
  
  describe('createDetailedError', () => {
    test('should create detailed error object', () => {
      const originalError = new Error('Test error');
      const context = 'test-context';
      const metadata = { testKey: 'testValue' };
      
      const detailedError = createDetailedError(originalError, context, metadata);
      
      expect(detailedError).toMatchObject({
        type: ErrorTypes.UNKNOWN_ERROR,
        message: 'Test error',
        context: 'test-context',
        metadata: { testKey: 'testValue' }
      });
      
      expect(detailedError.timestamp).toBeDefined();
      expect(detailedError.stack).toBeDefined();
    });
    
    test('should work without metadata', () => {
      const originalError = new Error('Test error');
      const detailedError = createDetailedError(originalError, 'test');
      
      expect(detailedError.metadata).toEqual({});
    });
  });
});