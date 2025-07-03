import { describe, test, expect } from 'vitest';
import { 
  normalizeOnlyItem, 
  findCommandIndex, 
  commandExists, 
  extractCommandName,
  migrateLockfileData 
} from '../../src/utils/lock-helpers.js';

describe('Lock Helpers', () => {
  describe('extractCommandName', () => {
    test('should extract command name from path', () => {
      expect(extractCommandName('commands/test.md')).toBe('test');
      expect(extractCommandName('folder/subfolder/command.md')).toBe('command');
      expect(extractCommandName('simple.md')).toBe('simple');
    });

    test('should throw error for invalid paths', () => {
      expect(() => extractCommandName('')).toThrow('Invalid command path');
      expect(() => extractCommandName(null)).toThrow('Invalid command path');
      expect(() => extractCommandName(undefined)).toThrow('Invalid command path');
      expect(() => extractCommandName(123)).toThrow('Invalid command path');
      expect(() => extractCommandName('/')).toThrow('Invalid command path');
      expect(() => extractCommandName('.md')).toThrow('Invalid command path');
    });
  });
  describe('normalizeOnlyItem', () => {
    test('should convert string to object format', () => {
      const result = normalizeOnlyItem('test-command');
      
      expect(result).toEqual({
        name: 'test-command',
        path: 'test-command.md',
        alias: null
      });
    });

    test('should return object as-is', () => {
      const input = {
        name: 'test-command',
        path: 'custom-path.md',
        alias: 'alias-name'
      };
      
      const result = normalizeOnlyItem(input);
      
      expect(result).toBe(input);
    });
  });

  describe('findCommandIndex', () => {
    test('should find command in string array', () => {
      const onlyArray = ['cmd1', 'cmd2', 'cmd3'];
      const index = findCommandIndex(onlyArray, 'cmd2');
      
      expect(index).toBe(1);
    });

    test('should find command in object array', () => {
      const onlyArray = [
        { name: 'cmd1', path: 'cmd1.md', alias: null },
        { name: 'cmd2', path: 'cmd2.md', alias: 'alias2' },
        { name: 'cmd3', path: 'cmd3.md', alias: null }
      ];
      const index = findCommandIndex(onlyArray, 'cmd2');
      
      expect(index).toBe(1);
    });

    test('should find command in mixed array', () => {
      const onlyArray = [
        'cmd1',
        { name: 'cmd2', path: 'cmd2.md', alias: 'alias2' },
        'cmd3'
      ];
      const index = findCommandIndex(onlyArray, 'cmd2');
      
      expect(index).toBe(1);
    });

    test('should return -1 when command not found', () => {
      const onlyArray = ['cmd1', 'cmd2', 'cmd3'];
      const index = findCommandIndex(onlyArray, 'cmd4');
      
      expect(index).toBe(-1);
    });
  });

  describe('commandExists', () => {
    test('should return true when command exists', () => {
      const onlyArray = [
        { name: 'cmd1', path: 'cmd1.md', alias: null },
        'cmd2'
      ];
      
      expect(commandExists(onlyArray, 'cmd1')).toBe(true);
      expect(commandExists(onlyArray, 'cmd2')).toBe(true);
    });

    test('should return false when command does not exist', () => {
      const onlyArray = [
        { name: 'cmd1', path: 'cmd1.md', alias: null },
        'cmd2'
      ];
      
      expect(commandExists(onlyArray, 'cmd3')).toBe(false);
    });

    test('should handle edge cases', () => {
      expect(commandExists([], 'cmd1')).toBe(false);
      expect(commandExists(null, 'cmd1')).toBe(false);
      expect(commandExists(undefined, 'cmd1')).toBe(false);
      expect(commandExists(['cmd1'], '')).toBe(false);
      expect(commandExists(['cmd1'], null)).toBe(false);
      expect(commandExists(['cmd1'], undefined)).toBe(false);
      
      // Test array with null/undefined items
      expect(commandExists([null, undefined, 'cmd1'], 'cmd1')).toBe(true);
      expect(commandExists([null, undefined], 'cmd1')).toBe(false);
      
      // Test malformed objects
      expect(commandExists([{}, { name: null }, { name: 'cmd1' }], 'cmd1')).toBe(true);
      expect(commandExists([{}, { name: null }], 'cmd1')).toBe(false);
    });
  });

  describe('migrateLockfileData', () => {
    test('should migrate string arrays to object arrays', () => {
      const lockData = {
        lockfileVersion: 1,
        repositories: {
          'user/repo1': {
            revision: 'abc123',
            only: ['cmd1', 'cmd2']
          },
          'user/repo2': {
            revision: 'def456',
            only: [
              { name: 'cmd3', path: 'cmd3.md', alias: null },
              'cmd4'
            ]
          }
        }
      };

      const migrated = migrateLockfileData(lockData);

      expect(migrated.repositories['user/repo1'].only).toEqual([
        { name: 'cmd1', path: 'cmd1.md', alias: null },
        { name: 'cmd2', path: 'cmd2.md', alias: null }
      ]);

      expect(migrated.repositories['user/repo2'].only).toEqual([
        { name: 'cmd3', path: 'cmd3.md', alias: null },
        { name: 'cmd4', path: 'cmd4.md', alias: null }
      ]);
    });

    test('should handle edge cases', () => {
      expect(migrateLockfileData(null)).toBeNull();
      expect(migrateLockfileData(undefined)).toBeUndefined();
      expect(migrateLockfileData({})).toEqual({});
      expect(migrateLockfileData({ repositories: null })).toEqual({ repositories: null });

      const emptyLock = { repositories: {} };
      expect(migrateLockfileData(emptyLock)).toEqual(emptyLock);

      const lockWithoutOnly = {
        repositories: {
          'user/repo': { revision: 'abc123' }
        }
      };
      expect(migrateLockfileData(lockWithoutOnly)).toEqual(lockWithoutOnly);
    });
  });
});