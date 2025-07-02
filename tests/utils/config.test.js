import { jest } from '@jest/globals';
import fs from 'fs-extra';
import { 
  loadJumonConfig, 
  saveJumonConfig, 
  loadJumonLock, 
  saveJumonLock,
  addRepositoryToConfig,
  addRepositoryToLock,
  getRepositoryFromLock
} from '../../src/utils/config.js';
import * as paths from '../../src/utils/paths.js';

// Mock fs-extra and paths
jest.mock('fs-extra');
jest.mock('../../src/utils/paths.js');

const mockedFs = fs;
const mockedPaths = paths;

describe('Config Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPaths.getJumonConfigPath.mockReturnValue('/test/jumon.json');
    mockedPaths.getJumonLockPath.mockReturnValue('/test/jumon-lock.json');
    mockedPaths.ensureJumonConfigDir.mockResolvedValue();
  });

  describe('loadJumonConfig', () => {
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

      const result = await loadJumonConfig(true);

      expect(result).toEqual(mockConfig);
      expect(mockedPaths.getJumonConfigPath).toHaveBeenCalledWith(true);
      expect(mockedFs.pathExists).toHaveBeenCalledWith('/test/jumon.json');
      expect(mockedFs.readJson).toHaveBeenCalledWith('/test/jumon.json');
    });

    test('should return default config when file does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      const result = await loadJumonConfig(false);

      expect(result).toEqual({ repositories: {} });
      expect(mockedPaths.getJumonConfigPath).toHaveBeenCalledWith(false);
    });

    test('should handle read errors gracefully', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockRejectedValue(new Error('Permission denied'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await loadJumonConfig(true);

      expect(result).toEqual({ repositories: {} });
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load jumon.json: Permission denied');
      
      consoleSpy.mockRestore();
    });
  });

  describe('saveJumonConfig', () => {
    test('should save config file', async () => {
      const config = {
        repositories: {
          'user/repo': { only: [] }
        }
      };

      await saveJumonConfig(config, true);

      expect(mockedPaths.ensureJumonConfigDir).toHaveBeenCalledWith(true);
      expect(mockedPaths.getJumonConfigPath).toHaveBeenCalledWith(true);
      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/jumon.json', config, { spaces: 2 });
    });
  });

  describe('loadJumonLock', () => {
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

      const result = await loadJumonLock(false);

      expect(result).toEqual(mockLock);
      expect(mockedPaths.getJumonLockPath).toHaveBeenCalledWith(false);
    });

    test('should return default lock when file does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      const result = await loadJumonLock(true);

      expect(result).toEqual({
        lockfileVersion: 1,
        repositories: {}
      });
    });
  });

  describe('saveJumonLock', () => {
    test('should save lock file', async () => {
      const lock = {
        lockfileVersion: 1,
        repositories: {}
      };

      await saveJumonLock(lock, false);

      expect(mockedPaths.ensureJumonConfigDir).toHaveBeenCalledWith(false);
      expect(mockedPaths.getJumonLockPath).toHaveBeenCalledWith(false);
      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/jumon-lock.json', lock, { spaces: 2 });
    });
  });

  describe('addRepositoryToConfig', () => {
    test('should add new repository with specific command', async () => {
      const existingConfig = { repositories: {} };
      
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingConfig);
      mockedFs.writeJson.mockResolvedValue();

      await addRepositoryToConfig('user', 'repo', 'test.md', 'alias', null, 'main', null, true);

      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/jumon.json', {
        repositories: {
          'user/repo': {
            branch: 'main',
            only: [{
              name: 'alias',
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

      await addRepositoryToConfig('user', 'repo', null, null, '1.0.0', null, null, false);

      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/jumon.json', {
        repositories: {
          'user/repo': {
            version: '1.0.0',
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

      await addRepositoryToConfig('user', 'repo', 'new.md', null, null, 'main', null, true);

      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/jumon.json', {
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

    test('should handle version/branch/tag precedence', async () => {
      const existingConfig = { repositories: {} };
      
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingConfig);
      mockedFs.writeJson.mockResolvedValue();

      // Version should take precedence
      await addRepositoryToConfig('user', 'repo', null, null, '1.0.0', 'main', 'v1.0.0', true);

      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/jumon.json', {
        repositories: {
          'user/repo': {
            version: '1.0.0',
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

      await addRepositoryToLock('user', 'repo', 'abc123', 'test.md', false);

      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/jumon-lock.json', {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'abc123',
            only: ['test']
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
            only: ['existing']
          }
        }
      };
      
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingLock);
      mockedFs.writeJson.mockResolvedValue();

      await addRepositoryToLock('user', 'repo', 'new456', 'test.md', true);

      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/jumon-lock.json', {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'new456',
            only: ['existing', 'test']
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

      await addRepositoryToLock('user', 'repo', 'abc123', null, false);

      expect(mockedFs.writeJson).toHaveBeenCalledWith('/test/jumon-lock.json', {
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
        only: ['test']
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