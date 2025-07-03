import { describe, test, expect, beforeEach, vi } from 'vitest';
import fs from 'fs-extra';
import { 
  loadCccscConfig, 
  saveCccscConfig, 
  loadCccscLock, 
  saveCccscLock,
  addRepositoryToConfig,
  addRepositoryToLock,
  getRepositoryFromLock
} from '../../src/utils/config.js';
import * as paths from '../../src/utils/paths.js';

// Mock fs-extra and paths
vi.mock('fs-extra');
vi.mock('../../src/utils/paths.js');

const mockedFs = vi.mocked(fs);
const mockedPaths = vi.mocked(paths);

describe('Config Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPaths.getCccscConfigPath.mockReturnValue('/test/cccsc.json');
    mockedPaths.getCccscLockPath.mockReturnValue('/test/cccsc-lock.json');
    mockedPaths.ensureCccscConfigDir.mockResolvedValue();
  });

  describe('loadCccscConfig', () => {
    test('should load existing config file', async () => {
      const mockConfig = {
        repositories: {
          'user/repo': {
            only: [{ name: 'test', path: 'test.md', alias: null }]
          }
        }
      };

      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(mockConfig);

      const result = await loadCccscConfig(true);

      expect(result).toEqual(mockConfig);
      expect(mockedPaths.getCccscConfigPath).toHaveBeenCalledWith(true);
      expect(mockedFs.pathExists).toHaveBeenCalledWith('/test/cccsc.json');
      expect(mockedFs.readJson).toHaveBeenCalledWith('/test/cccsc.json');
    });

    test('should return default config when file does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      const result = await loadCccscConfig(false);

      expect(result).toEqual({ repositories: {} });
      expect(mockedPaths.getCccscConfigPath).toHaveBeenCalledWith(false);
    });

    test('should handle read errors gracefully', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockRejectedValue(new Error('Permission denied'));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      const result = await loadCccscConfig(true);

      expect(result).toEqual({ repositories: {} });
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load cccsc.json: Permission denied');
      
      consoleSpy.mockRestore();
    });
  });

  describe('saveCccscConfig', () => {
    test('should save config file', async () => {
      const config = {
        repositories: {
          'user/repo': { only: [] }
        }
      };

      await saveCccscConfig(config, true);

      expect(mockedPaths.ensureCccscConfigDir).toHaveBeenCalledWith(true);
      expect(mockedPaths.getCccscConfigPath).toHaveBeenCalledWith(true);
      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/cccsc.json', config, { spaces: 2 });
    });
  });

  describe('loadCccscLock', () => {
    test('should load existing lock file', async () => {
      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'abc123',
            only: ['test']
          }
        }
      };

      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(mockLock);

      const result = await loadCccscLock(false);

      expect(result).toEqual(mockLock);
      expect(mockedPaths.getCccscLockPath).toHaveBeenCalledWith(false);
    });

    test('should return default lock when file does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      const result = await loadCccscLock(true);

      expect(result).toEqual({
        lockfileVersion: 3,
        repositories: {}
      });
    });
  });

  describe('saveCccscLock', () => {
    test('should save lock file', async () => {
      const lock = {
        lockfileVersion: 1,
        repositories: {}
      };

      await saveCccscLock(lock, false);

      expect(mockedPaths.ensureCccscConfigDir).toHaveBeenCalledWith(false);
      expect(mockedPaths.getCccscLockPath).toHaveBeenCalledWith(false);
      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/cccsc-lock.json', lock, { spaces: 2 });
    });
  });

  describe('addRepositoryToConfig', () => {
    test('should add new repository with specific command', async () => {
      const existingConfig = { repositories: {} };
      
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingConfig);
      mockedFs.writeJson.mockResolvedValue();

      await addRepositoryToConfig('user', 'repo', 'test.md', 'alias', 'main', true);

      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/cccsc.json', {
        repositories: {
          'user/repo': {
            branch: 'main',
            only: [{
              name: 'test',
              path: 'test.md',
              alias: 'alias'
            }]
          }
        }
      }, { spaces: 2 });
    });

    test('should add repository with all commands', async () => {
      const existingConfig = { repositories: {} };
      
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingConfig);
      mockedFs.writeJson.mockResolvedValue();

      await addRepositoryToConfig('user', 'repo', null, null, 'main', false);

      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/cccsc.json', {
        repositories: {
          'user/repo': {
            branch: 'main',
            only: []
          }
        }
      }, { spaces: 2 });
    });

    test('should update existing repository with new command', async () => {
      const existingConfig = {
        repositories: {
          'user/repo': {
            only: [{ name: 'existing', path: 'existing.md', alias: null }]
          }
        }
      };
      
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingConfig);
      mockedFs.writeJson.mockResolvedValue();

      await addRepositoryToConfig('user', 'repo', 'new.md', null, 'main', true);

      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/cccsc.json', {
        repositories: {
          'user/repo': {
            branch: 'main',
            only: [
              { name: 'existing', path: 'existing.md', alias: null },
              { name: 'new', path: 'new.md', alias: null }
            ]
          }
        }
      }, { spaces: 2 });
    });

    test('should handle branch constraint', async () => {
      const existingConfig = { repositories: {} };
      
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingConfig);
      mockedFs.writeJson.mockResolvedValue();

      await addRepositoryToConfig('user', 'repo', null, null, 'develop', true);

      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/cccsc.json', {
        repositories: {
          'user/repo': {
            branch: 'develop',
            only: []
          }
        }
      }, { spaces: 2 });
    });
  });

  describe('addRepositoryToLock', () => {
    test('should add new repository to lock', async () => {
      const existingLock = {
        lockfileVersion: 1,
        repositories: {}
      };
      
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingLock);
      mockedFs.writeJson.mockResolvedValue();

      await addRepositoryToLock('user', 'repo', 'abc123', 'test.md', null, false);

      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/cccsc-lock.json', {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'abc123',
            only: [{
              name: 'test',
              path: 'test.md',
              alias: null
            }]
          }
        }
      }, { spaces: 2 });
    });

    test('should update existing repository in lock', async () => {
      const existingLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'old123',
            only: [{
              name: 'existing',
              path: 'existing.md',
              alias: null
            }]
          }
        }
      };
      
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingLock);
      mockedFs.writeJson.mockResolvedValue();

      await addRepositoryToLock('user', 'repo', 'new456', 'test.md', null, true);

      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/cccsc-lock.json', {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'new456',
            only: [{
              name: 'existing',
              path: 'existing.md',
              alias: null
            }, {
              name: 'test',
              path: 'test.md',
              alias: null
            }]
          }
        }
      }, { spaces: 2 });
    });

    test('should add repository with alias to lock', async () => {
      const existingLock = {
        lockfileVersion: 1,
        repositories: {}
      };
      
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingLock);
      mockedFs.writeJson.mockResolvedValue();

      await addRepositoryToLock('user', 'repo', 'abc123', 'test.md', 'my-alias', false);

      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/cccsc-lock.json', {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'abc123',
            only: [{
              name: 'test',
              path: 'test.md',
              alias: 'my-alias'
            }]
          }
        }
      }, { spaces: 2 });
    });

    test('should update existing command alias in lock', async () => {
      const existingLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'old123',
            only: [{
              name: 'test',
              path: 'test.md',
              alias: 'old-alias'
            }]
          }
        }
      };
      
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingLock);
      mockedFs.writeJson.mockResolvedValue();

      await addRepositoryToLock('user', 'repo', 'new456', 'test.md', 'new-alias', false);

      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/cccsc-lock.json', {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'new456',
            only: [{
              name: 'test',
              path: 'test.md',
              alias: 'new-alias'
            }]
          }
        }
      }, { spaces: 2 });
    });

    test('should handle all commands mode', async () => {
      const existingLock = {
        lockfileVersion: 1,
        repositories: {}
      };
      
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingLock);
      mockedFs.writeJson.mockResolvedValue();

      await addRepositoryToLock('user', 'repo', 'abc123', null, null, false);

      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/cccsc-lock.json', {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'abc123',
            only: []
          }
        }
      }, { spaces: 2 });
    });
  });

  describe('getRepositoryFromLock', () => {
    test('should return repository from lock', async () => {
      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'abc123',
            only: ['test']
          }
        }
      };

      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(mockLock);

      const result = await getRepositoryFromLock('user', 'repo', true);

      expect(result).toEqual({
        revision: 'abc123',
        only: [{
          name: 'test',
          path: 'test.md',
          alias: null
        }]
      });
    });

    test('should return null when repository not found', async () => {
      const mockLock = {
        lockfileVersion: 1,
        repositories: {}
      };

      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(mockLock);

      const result = await getRepositoryFromLock('user', 'nonexistent', false);

      expect(result).toBeNull();
    });
  });
});