import { describe, test, expect } from 'vitest';
import { parseRepositoryPath } from '../../src/utils/github.js';

describe('GitHub Utils - Simple Tests', () => {
  describe('parseRepositoryPath', () => {
    test('should parse user/repo format', () => {
      const result = parseRepositoryPath('user/repo');
      expect(result).toEqual({
        user: 'user',
        repo: 'repo',
        commandPath: null
      });
    });

    test('should parse user/repo/command format', () => {
      const result = parseRepositoryPath('user/repo/command');
      expect(result).toEqual({
        user: 'user',
        repo: 'repo',
        commandPath: 'command'
      });
    });

    test('should parse user/repo/path/to/command format', () => {
      const result = parseRepositoryPath('user/repo/path/to/command');
      expect(result).toEqual({
        user: 'user',
        repo: 'repo',
        commandPath: 'path/to/command'
      });
    });

    test('should throw error for invalid format', () => {
      expect(() => parseRepositoryPath('invalid')).toThrow('Invalid repository path format. Expected user/repo or user/repo/command');
      expect(() => parseRepositoryPath('')).toThrow('Invalid repository path format. Expected user/repo or user/repo/command');
    });
  });
});