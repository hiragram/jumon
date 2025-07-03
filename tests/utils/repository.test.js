import { describe, test, expect } from 'vitest';
import { parseRepositoryKey, validateRepositoryConfig, normalizeRepositoryConfig } from '../../src/utils/repository.js';

describe('Repository Utils', () => {
  describe('parseRepositoryKey', () => {
    test('should parse valid repository key', () => {
      const result = parseRepositoryKey('user/repo');
      expect(result).toEqual({ user: 'user', repo: 'repo' });
    });

    test('should throw error for invalid format', () => {
      expect(() => parseRepositoryKey('invalid')).toThrow('Invalid repository key format');
      expect(() => parseRepositoryKey('user/')).toThrow('Invalid repository key format');
      expect(() => parseRepositoryKey('/repo')).toThrow('Invalid repository key format');
      expect(() => parseRepositoryKey('user/repo/extra')).toThrow('Invalid repository key format');
    });

    test('should throw error for non-string input', () => {
      expect(() => parseRepositoryKey(null)).toThrow('Repository key must be a string');
      expect(() => parseRepositoryKey(undefined)).toThrow('Repository key must be a string');
      expect(() => parseRepositoryKey(123)).toThrow('Repository key must be a string');
    });
  });

  describe('validateRepositoryConfig', () => {
    test('should validate correct configuration', () => {
      expect(validateRepositoryConfig({})).toBe(true);
      expect(validateRepositoryConfig({ branch: 'main' })).toBe(true);
      expect(validateRepositoryConfig({ version: '1.0.0' })).toBe(true);
      expect(validateRepositoryConfig({ tag: 'v1.0.0' })).toBe(true);
      expect(validateRepositoryConfig({ only: [] })).toBe(true);
      expect(validateRepositoryConfig({ only: [{ name: 'cmd', path: 'cmd.md' }] })).toBe(true);
    });

    test('should reject invalid configuration', () => {
      expect(validateRepositoryConfig(null)).toBe(false);
      expect(validateRepositoryConfig(undefined)).toBe(false);
      expect(validateRepositoryConfig('string')).toBe(false);
      expect(validateRepositoryConfig({ branch: 123 })).toBe(false);
      expect(validateRepositoryConfig({ version: null })).toBe(false);
      expect(validateRepositoryConfig({ tag: [] })).toBe(false);
      expect(validateRepositoryConfig({ only: 'not-array' })).toBe(false);
    });
  });

  describe('normalizeRepositoryConfig', () => {
    test('should normalize valid configuration with defaults', () => {
      const result = normalizeRepositoryConfig({});
      expect(result).toEqual({
        branch: 'main',
        version: null,
        tag: null,
        only: []
      });
    });

    test('should preserve provided values', () => {
      const result = normalizeRepositoryConfig({
        branch: 'develop',
        version: '1.0.0',
        only: [{ name: 'cmd' }]
      });
      expect(result).toEqual({
        branch: 'develop',
        version: '1.0.0',
        tag: null,
        only: [{ name: 'cmd' }]
      });
    });

    test('should throw error for invalid configuration', () => {
      expect(() => normalizeRepositoryConfig(null)).toThrow('Invalid repository configuration');
      expect(() => normalizeRepositoryConfig({ branch: 123 })).toThrow('Invalid repository configuration');
    });
  });
});