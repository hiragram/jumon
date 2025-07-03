import { describe, test, expect } from 'vitest';
import { createAddParams, createLockParams, validateCommandParams } from '../../src/utils/command-params.js';

describe('Command Params', () => {
  describe('createAddParams', () => {
    test('should create valid add parameters', () => {
      const params = createAddParams('user', 'repo', 'cmd.md', 'alias', 'main', true);
      
      expect(params).toEqual({
        user: 'user',
        repo: 'repo',
        commandPath: 'cmd.md',
        alias: 'alias',
        branch: 'main',
        isLocal: true
      });
    });
    
    test('should handle null values', () => {
      const params = createAddParams('user', 'repo');
      
      expect(params).toEqual({
        user: 'user',
        repo: 'repo',
        commandPath: null,
        alias: null,
        branch: null,
        isLocal: false
      });
    });
  });
  
  describe('createLockParams', () => {
    test('should create valid lock parameters', () => {
      const params = createLockParams('user', 'repo', 'abc123', 'cmd.md', 'alias', true);
      
      expect(params).toEqual({
        user: 'user',
        repo: 'repo',
        revision: 'abc123',
        commandPath: 'cmd.md',
        alias: 'alias',
        isLocal: true
      });
    });
    
    test('should handle null values', () => {
      const params = createLockParams('user', 'repo', 'abc123');
      
      expect(params).toEqual({
        user: 'user',
        repo: 'repo',
        revision: 'abc123',
        commandPath: null,
        alias: null,
        isLocal: false
      });
    });
  });
  
  describe('validateCommandParams', () => {
    test('should validate add parameters correctly', () => {
      const validParams = createAddParams('user', 'repo');
      expect(validateCommandParams(validParams)).toBe(true);
      
      const invalidParams = { user: '', repo: 'repo' };
      expect(validateCommandParams(invalidParams)).toBe(false);
      
      expect(validateCommandParams(null)).toBe(false);
      expect(validateCommandParams(undefined)).toBe(false);
      expect(validateCommandParams({})).toBe(false);
    });
    
    test('should validate lock parameters correctly', () => {
      const validParams = createLockParams('user', 'repo', 'abc123');
      expect(validateCommandParams(validParams)).toBe(true);
      
      const invalidParams = { user: 'user', repo: 'repo', revision: '' };
      expect(validateCommandParams(invalidParams)).toBe(false);
    });
  });
});