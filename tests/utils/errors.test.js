import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleCommandError, logWarning, logError, logSuccess, withErrorHandling } from '../../src/utils/errors.js';

describe('Error Utils', () => {
  let consoleSpy;
  let processExitSpy;

  beforeEach(() => {
    consoleSpy = {
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {})
    };
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleCommandError', () => {
    test('should log error and exit by default', () => {
      const error = new Error('Test error');
      handleCommandError(error, 'Test context');
      
      expect(consoleSpy.error).toHaveBeenCalledWith('Error in Test context: Test error');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should not exit when exitProcess is false', () => {
      const error = new Error('Test error');
      handleCommandError(error, 'Test context', false);
      
      expect(consoleSpy.error).toHaveBeenCalledWith('Error in Test context: Test error');
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    test('should handle error without message', () => {
      handleCommandError({}, 'Test context');
      
      expect(consoleSpy.error).toHaveBeenCalledWith('Error in Test context: Unknown error occurred');
    });
  });

  describe('logWarning', () => {
    test('should log warning with context', () => {
      logWarning('Test warning', 'Test context');
      expect(consoleSpy.warn).toHaveBeenCalledWith('⚠️  [Test context] Test warning');
    });

    test('should log warning without context', () => {
      logWarning('Test warning');
      expect(consoleSpy.warn).toHaveBeenCalledWith('⚠️  Test warning');
    });
  });

  describe('logError', () => {
    test('should log error with context', () => {
      logError('Test error', 'Test context');
      expect(consoleSpy.error).toHaveBeenCalledWith('✗ [Test context] Test error');
    });

    test('should log error without context', () => {
      logError('Test error');
      expect(consoleSpy.error).toHaveBeenCalledWith('✗ Test error');
    });
  });

  describe('logSuccess', () => {
    test('should log success with context', () => {
      logSuccess('Test success', 'Test context');
      expect(consoleSpy.log).toHaveBeenCalledWith('✓ [Test context] Test success');
    });

    test('should log success without context', () => {
      logSuccess('Test success');
      expect(consoleSpy.log).toHaveBeenCalledWith('✓ Test success');
    });
  });

  describe('withErrorHandling', () => {
    test('should wrap function with error handling', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const wrappedFn = withErrorHandling(mockFn, 'Test context');
      
      const result = await wrappedFn('arg1', 'arg2');
      
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('success');
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    test('should handle errors in wrapped function', async () => {
      const error = new Error('Test error');
      const mockFn = vi.fn().mockRejectedValue(error);
      const wrappedFn = withErrorHandling(mockFn, 'Test context');
      
      await wrappedFn('arg1');
      
      expect(consoleSpy.error).toHaveBeenCalledWith('Error in Test context: Test error');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});