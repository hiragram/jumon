import { describe, test, expect } from 'vitest';
import { normalizeOnlyItem, findCommandIndex, commandExists } from '../../src/utils/lock-helpers.js';

describe('Lock Helpers', () => {
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
  });
});