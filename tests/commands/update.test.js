import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import { updateCommand } from '../../src/commands/update.js';
import { installCommand } from '../../src/commands/install.js';
import * as github from '../../src/utils/github.js';
import * as paths from '../../src/utils/paths.js';
import * as config from '../../src/utils/config.js';

// Mock dependencies
vi.mock('fs-extra');
vi.mock('../../src/commands/install.js');
vi.mock('../../src/utils/github.js');
vi.mock('../../src/utils/paths.js');
vi.mock('../../src/utils/config.js');

const mockedFs = vi.mocked(fs);
const mockedInstallCommand = vi.mocked(installCommand);
const mockedGithub = vi.mocked(github);
const mockedPaths = vi.mocked(paths);
const mockedConfig = vi.mocked(config);

describe('Update Command', () => {
  let consoleSpy;
  let processExitSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods
    consoleSpy = vi.spyOn(console, 'log').mockImplementation();
    vi.spyOn(console, 'error').mockImplementation();
    vi.spyOn(console, 'warn').mockImplementation();
    
    // Mock process.exit
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation();
    
    // Setup default mocks
    mockedPaths.ensureCommandsDir.mockResolvedValue('/test/commands');
    mockedFs.pathExists.mockResolvedValue(true);
    mockedFs.remove.mockResolvedValue();
    mockedGithub.resolveRepositoryRevision.mockResolvedValue('newcommit123');
    mockedConfig.saveJumonLock.mockResolvedValue();
    mockedInstallCommand.mockResolvedValue();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('successful update scenarios', () => {
    test('should update repositories with newer commits and reinstall', async () => {
      const mockConfig = {
        repositories: {
          'user/repo': {
            branch: 'main',
            only: [
              { name: 'cmd1', path: 'cmd1.md', alias: null }
            ]
          }
        }
      };

      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'oldcommit123',
            only: ['cmd1']
          }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedConfig.loadJumonLock.mockResolvedValue(mockLock);

      const options = { global: false };

      await updateCommand(options);

      // Should call the three main steps
      expect(mockedGithub.resolveRepositoryRevision).toHaveBeenCalledWith('user', 'repo', mockConfig.repositories['user/repo']);
      expect(mockedFs.remove).toHaveBeenCalledWith('/test/commands/user/repo');
      expect(mockedInstallCommand).toHaveBeenCalledWith({ ...options, skipLockFileSave: true });
      expect(mockedConfig.saveJumonLock).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('\n🎉 Update complete!');
    });

    test('should skip repositories that are already up to date', async () => {
      const mockConfig = {
        repositories: {
          'user/repo': {
            branch: 'main',
            only: []
          }
        }
      };

      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'newcommit123',
            only: []
          }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedConfig.loadJumonLock.mockResolvedValue(mockLock);

      const options = { global: false };

      await updateCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('user/repo is already up to date');
      expect(mockedInstallCommand).toHaveBeenCalledWith({ ...options, skipLockFileSave: true });
    });

    test('should handle version constraints', async () => {
      const mockConfig = {
        repositories: {
          'user/repo': {
            version: '1.0.0',
            only: []
          }
        }
      };

      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'oldcommit123',
            only: []
          }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedConfig.loadJumonLock.mockResolvedValue(mockLock);
      mockedGithub.resolveRepositoryRevision.mockResolvedValue('tagcommit123');

      const options = { global: false };

      await updateCommand(options);

      expect(mockedGithub.resolveRepositoryRevision).toHaveBeenCalledWith('user', 'repo', { version: '1.0.0', only: [] });
    });

    test('should handle tag constraints', async () => {
      const mockConfig = {
        repositories: {
          'user/repo': {
            tag: 'v2.0.0',
            only: []
          }
        }
      };

      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'oldcommit123',
            only: []
          }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedConfig.loadJumonLock.mockResolvedValue(mockLock);
      mockedGithub.resolveRepositoryRevision.mockResolvedValue('tagcommit456');

      const options = { global: false };

      await updateCommand(options);

      expect(mockedGithub.resolveRepositoryRevision).toHaveBeenCalledWith('user', 'repo', { tag: 'v2.0.0', only: [] });
    });

    test('should handle multiple repositories', async () => {
      const mockConfig = {
        repositories: {
          'user1/repo1': { branch: 'main', only: [] },
          'user2/repo2': { branch: 'dev', only: [] }
        }
      };

      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user1/repo1': { revision: 'oldcommit1', only: [] },
          'user2/repo2': { revision: 'oldcommit2', only: [] }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedConfig.loadJumonLock.mockResolvedValue(mockLock);
      mockedGithub.resolveRepositoryRevision.mockResolvedValue('newcommit123');

      const options = { global: false };

      await updateCommand(options);

      expect(mockedGithub.resolveRepositoryRevision).toHaveBeenCalledTimes(2);
      expect(mockedFs.remove).toHaveBeenCalledWith('/test/commands/user1/repo1');
      expect(mockedFs.remove).toHaveBeenCalledWith('/test/commands/user2/repo2');
    });
  });

  describe('error handling', () => {
    test('should handle empty configuration', async () => {
      mockedConfig.loadJumonConfig.mockResolvedValue({ repositories: {} });

      const options = { global: false };

      await updateCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('No repositories to update (jumon.json is empty or not found)');
      expect(mockedGithub.resolveRepositoryRevision).not.toHaveBeenCalled();
      expect(mockedInstallCommand).not.toHaveBeenCalled();
    });

    test('should handle missing configuration file', async () => {
      mockedConfig.loadJumonConfig.mockResolvedValue({ repositories: null });

      const options = { global: false };

      await updateCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('No repositories to update (jumon.json is empty or not found)');
    });

    test('should handle revision resolution errors', async () => {
      const mockConfig = {
        repositories: {
          'user/repo': { branch: 'main', only: [] }
        }
      };

      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': { revision: 'oldcommit123', only: [] }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedConfig.loadJumonLock.mockResolvedValue(mockLock);
      mockedGithub.resolveRepositoryRevision.mockRejectedValue(new Error('Repository not found'));

      const options = { global: false };

      await updateCommand(options);

      expect(console.error).toHaveBeenCalledWith('✗ Failed to update user/repo: Repository not found');
      expect(mockedInstallCommand).toHaveBeenCalled(); // Should still continue with install
    });

    test('should handle directory removal errors', async () => {
      const mockConfig = {
        repositories: {
          'user/repo': { branch: 'main', only: [] }
        }
      };

      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': { revision: 'oldcommit123', only: [] }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedConfig.loadJumonLock.mockResolvedValue(mockLock);
      
      // Mock fs.pathExists to return false to avoid removal attempt
      mockedFs.pathExists.mockResolvedValue(false);

      const options = { global: false };

      await updateCommand(options);

      // Should still proceed with install despite no directory to remove
      expect(mockedInstallCommand).toHaveBeenCalled();
      expect(mockedFs.remove).not.toHaveBeenCalled();
    });

    test('should handle install command errors', async () => {
      const mockConfig = {
        repositories: {
          'user/repo': { branch: 'main', only: [] }
        }
      };

      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': { revision: 'oldcommit123', only: [] }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedConfig.loadJumonLock.mockResolvedValue(mockLock);
      mockedInstallCommand.mockRejectedValue(new Error('Install failed'));

      const options = { global: false };

      await expect(updateCommand(options)).rejects.toThrow('process.exit unexpectedly called with "1"');
      expect(console.error).toHaveBeenCalledWith('Error: Install failed');
    });

    test('should handle general errors', async () => {
      mockedConfig.loadJumonConfig.mockRejectedValue(new Error('Config corrupted'));

      const options = { global: false };

      await expect(updateCommand(options)).rejects.toThrow('process.exit unexpectedly called with "1"');
      expect(console.error).toHaveBeenCalledWith('Error: Config corrupted');
    });
  });

  describe('global vs local', () => {
    test('should handle global update', async () => {
      const mockConfig = { repositories: {} };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);

      const options = { global: true };

      await updateCommand(options);

      expect(mockedConfig.loadJumonConfig).toHaveBeenCalledWith(false); // isLocal should be false for global: true
      expect(consoleSpy).toHaveBeenCalledWith('No repositories to update (jumon.json is empty or not found)');
    });
  });

  describe('lock file management', () => {
    test('should create lock file repositories object if missing', async () => {
      const mockConfig = {
        repositories: {
          'user/repo': { branch: 'main', only: [] }
        }
      };

      const mockLock = {
        lockfileVersion: 1
        // Missing repositories object
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedConfig.loadJumonLock.mockResolvedValue(mockLock);

      const options = { global: false };

      await updateCommand(options);

      // Should have created repositories object and updated it
      expect(mockedConfig.saveJumonLock).toHaveBeenCalledWith(
        expect.objectContaining({
          repositories: expect.objectContaining({
            'user/repo': expect.objectContaining({
              revision: 'newcommit123',
              only: []
            })
          })
        }),
        true
      );
    });

    test('should pass skipLockFileSave option to installCommand', async () => {
      const mockConfig = {
        repositories: {
          'user/repo': { branch: 'main', only: [] }
        }
      };

      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': { revision: 'oldcommit123', only: [] }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedConfig.loadJumonLock.mockResolvedValue(mockLock);

      const options = { global: false };

      await updateCommand(options);

      expect(mockedInstallCommand).toHaveBeenCalledWith({
        global: false,
        skipLockFileSave: true
      });
    });
  });
});