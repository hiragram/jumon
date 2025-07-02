import { jest } from '@jest/globals';
import fs from 'fs-extra';
import { removeCommand } from '../../src/commands/remove.js';
import * as paths from '../../src/utils/paths.js';
import * as config from '../../src/utils/config.js';

// Mock all dependencies
jest.mock('fs-extra');
jest.mock('../../src/utils/paths.js');
jest.mock('../../src/utils/config.js');

const mockedFs = fs;
const mockedPaths = paths;
const mockedConfig = config;

describe('Remove Command', () => {
  let consoleSpy;
  let processExitSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    
    // Mock process.exit
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
    
    // Setup default mocks
    mockedPaths.getCommandsPath.mockReturnValue('/test/commands');
    mockedFs.pathExists.mockResolvedValue(true);
    mockedConfig.loadJumonConfig.mockResolvedValue({ repositories: {} });
    mockedConfig.loadJumonLock.mockResolvedValue({ lockfileVersion: 1, repositories: {} });
    mockedConfig.saveJumonConfig.mockResolvedValue();
    mockedConfig.saveJumonLock.mockResolvedValue();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('successful removal from configuration', () => {
    test('should remove specific command from repository configuration', async () => {
      const mockConfig = {
        repositories: {
          'testuser/testrepo': {
            only: [
              { name: 'test', path: 'test.md', alias: null },
              { name: 'other', path: 'other.md', alias: null }
            ]
          }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.remove.mockResolvedValue();
      mockedFs.readdir.mockResolvedValue(['other.md']);

      const options = { global: false };

      await removeCommand('test', options);

      expect(mockedFs.remove).toHaveBeenCalledWith('/test/commands/testuser/testrepo/test.md');
      expect(mockedConfig.saveJumonConfig).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith("✓ Successfully removed command 'test' (from testuser/testrepo)");
    });

    test('should remove command by alias', async () => {
      const mockConfig = {
        repositories: {
          'testuser/testrepo': {
            only: [
              { name: 'custom-name', path: 'test.md', alias: 'custom-name' }
            ]
          }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.remove.mockResolvedValue();
      mockedFs.readdir.mockResolvedValue([]);

      const options = { global: false };

      await removeCommand('custom-name', options);

      expect(mockedFs.remove).toHaveBeenCalledWith('/test/commands/testuser/testrepo/custom-name.md');
      expect(consoleSpy).toHaveBeenCalledWith("✓ Successfully removed command 'custom-name' (from testuser/testrepo)");
    });

    test('should remove entire repository when removing last command', async () => {
      const mockConfig = {
        repositories: {
          'testuser/testrepo': {
            only: [
              { name: 'test', path: 'test.md', alias: null }
            ]
          }
        }
      };

      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'testuser/testrepo': {
            revision: 'abc123',
            only: ['test']
          }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedConfig.loadJumonLock.mockResolvedValue(mockLock);
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.remove.mockResolvedValue();
      mockedFs.readdir.mockResolvedValue([]);

      const options = { global: false };

      await removeCommand('test', options);

      // Should remove the repository entry from config
      const savedConfig = mockedConfig.saveJumonConfig.mock.calls[0][0];
      expect(savedConfig.repositories['testuser/testrepo']).toBeUndefined();

      // Should remove the repository entry from lock
      const savedLock = mockedConfig.saveJumonLock.mock.calls[0][0];
      expect(savedLock.repositories['testuser/testrepo']).toBeUndefined();
    });

    test('should handle all-commands mode (empty only array)', async () => {
      const mockConfig = {
        repositories: {
          'testuser/testrepo': {
            only: []
          }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.remove.mockResolvedValue();
      mockedFs.readdir.mockResolvedValue([]);

      const options = { global: false };

      await removeCommand('test', options);

      expect(mockedFs.remove).toHaveBeenCalledWith('/test/commands/testuser/testrepo/test.md');
      expect(consoleSpy).toHaveBeenCalledWith("✓ Successfully removed command 'test' (from testuser/testrepo)");
    });

    test('should clean up empty directories after removal', async () => {
      const mockConfig = {
        repositories: {
          'testuser/testrepo': {
            only: [
              { name: 'test', path: 'test.md', alias: null }
            ]
          }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.remove.mockResolvedValue();
      mockedFs.readdir
        .mockResolvedValueOnce([]) // repo directory empty
        .mockResolvedValueOnce([]); // user directory empty

      const options = { global: false };

      await removeCommand('test', options);

      expect(mockedFs.remove).toHaveBeenCalledWith('/test/commands/testuser/testrepo/test.md');
      expect(mockedFs.remove).toHaveBeenCalledWith('/test/commands/testuser/testrepo');
      expect(mockedFs.remove).toHaveBeenCalledWith('/test/commands/testuser');
    });

    test('should not clean up directories with remaining files', async () => {
      const mockConfig = {
        repositories: {
          'testuser/testrepo': {
            only: [
              { name: 'test', path: 'test.md', alias: null }
            ]
          }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.remove.mockResolvedValue();
      mockedFs.readdir.mockResolvedValue(['other.md']); // repo directory not empty

      const options = { global: false };

      await removeCommand('test', options);

      expect(mockedFs.remove).toHaveBeenCalledWith('/test/commands/testuser/testrepo/test.md');
      expect(mockedFs.remove).not.toHaveBeenCalledWith('/test/commands/testuser/testrepo');
    });
  });

  describe('fallback to filesystem search', () => {
    test('should find and remove command by filesystem search when not in config', async () => {
      mockedConfig.loadJumonConfig.mockResolvedValue({ repositories: {} });
      
      mockedFs.readdir
        .mockResolvedValueOnce(['testuser'])
        .mockResolvedValueOnce(['testrepo'])
        .mockResolvedValueOnce([]); // repo directory empty after removal

      mockedFs.stat.mockResolvedValue({ isDirectory: () => true });
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.remove.mockResolvedValue();

      const options = { global: false };

      await removeCommand('test', options);

      expect(mockedFs.pathExists).toHaveBeenCalledWith('/test/commands/testuser/testrepo/test.md');
      expect(mockedFs.remove).toHaveBeenCalledWith('/test/commands/testuser/testrepo/test.md');
      expect(consoleSpy).toHaveBeenCalledWith("✓ Successfully removed command 'test' (from testuser/testrepo)");
    });

    test('should handle multiple user directories in filesystem search', async () => {
      mockedConfig.loadJumonConfig.mockResolvedValue({ repositories: {} });
      
      mockedFs.readdir
        .mockResolvedValueOnce(['user1', 'user2'])
        .mockResolvedValueOnce(['repo1']) // user1 repos
        .mockResolvedValueOnce(['repo2']); // user2 repos

      mockedFs.stat.mockResolvedValue({ isDirectory: () => true });
      
      // File exists in user2/repo2
      mockedFs.pathExists
        .mockResolvedValueOnce(false) // user1/repo1/test.md
        .mockResolvedValueOnce(true);  // user2/repo2/test.md

      mockedFs.remove.mockResolvedValue();
      mockedFs.readdir.mockResolvedValueOnce([]); // repo directory empty after removal

      const options = { global: false };

      await removeCommand('test', options);

      expect(mockedFs.pathExists).toHaveBeenCalledWith('/test/commands/user1/repo1/test.md');
      expect(mockedFs.pathExists).toHaveBeenCalledWith('/test/commands/user2/repo2/test.md');
      expect(mockedFs.remove).toHaveBeenCalledWith('/test/commands/user2/repo2/test.md');
    });
  });

  describe('error handling', () => {
    test('should exit when commands directory does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      const options = { global: false };

      await removeCommand('test', options);

      expect(processExitSpy).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith('No commands directory found');
    });

    test('should exit when command is not found', async () => {
      mockedConfig.loadJumonConfig.mockResolvedValue({ repositories: {} });
      mockedFs.readdir.mockResolvedValue([]);

      const options = { global: false };

      await removeCommand('nonexistent', options);

      expect(processExitSpy).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith("Command 'nonexistent' not found");
    });

    test('should handle filesystem errors gracefully', async () => {
      const mockConfig = {
        repositories: {
          'testuser/testrepo': {
            only: [
              { name: 'test', path: 'test.md', alias: null }
            ]
          }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.remove.mockRejectedValue(new Error('Permission denied'));

      const options = { global: false };

      await removeCommand('test', options);

      expect(processExitSpy).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith('Error: Permission denied');
    });

    test('should handle readdir errors in filesystem search', async () => {
      mockedConfig.loadJumonConfig.mockResolvedValue({ repositories: {} });
      mockedFs.readdir.mockRejectedValue(new Error('Access denied'));

      const options = { global: false };

      await removeCommand('test', options);

      expect(processExitSpy).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith('Error: Access denied');
    });
  });

  describe('global vs local', () => {
    test('should handle global removal', async () => {
      const mockConfig = {
        repositories: {
          'testuser/testrepo': {
            only: [
              { name: 'test', path: 'test.md', alias: null }
            ]
          }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.remove.mockResolvedValue();
      mockedFs.readdir.mockResolvedValue([]);

      const options = { global: true };

      await removeCommand('test', options);

      expect(mockedPaths.getCommandsPath).toHaveBeenCalledWith(false);
      expect(mockedConfig.loadJumonConfig).toHaveBeenCalledWith(false);
      expect(mockedConfig.loadJumonLock).toHaveBeenCalledWith(false);
    });

    test('should handle local removal by default', async () => {
      const mockConfig = {
        repositories: {
          'testuser/testrepo': {
            only: [
              { name: 'test', path: 'test.md', alias: null }
            ]
          }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.remove.mockResolvedValue();
      mockedFs.readdir.mockResolvedValue([]);

      const options = {};

      await removeCommand('test', options);

      expect(mockedPaths.getCommandsPath).toHaveBeenCalledWith(true);
      expect(mockedConfig.loadJumonConfig).toHaveBeenCalledWith(true);
      expect(mockedConfig.loadJumonLock).toHaveBeenCalledWith(true);
    });
  });
});