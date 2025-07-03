import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import { removeCommand } from '../../src/commands/remove.js';
import * as paths from '../../src/utils/paths.js';
import * as config from '../../src/utils/config.js';

// Mock all dependencies
vi.mock('fs-extra');
vi.mock('../../src/utils/paths.js');
vi.mock('../../src/utils/config.js');

const mockedFs = vi.mocked(fs);
const mockedPaths = vi.mocked(paths);
const mockedConfig = vi.mocked(config);

describe('Remove Command', () => {
  let consoleSpy;
  let processExitSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods
    consoleSpy = vi.spyOn(console, 'log').mockImplementation();
    vi.spyOn(console, 'error').mockImplementation();
    
    // Mock process.exit
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation();
    
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
      
      // Mock readdir to return the correct values in sequence
      mockedFs.readdir
        .mockResolvedValueOnce(['testuser']) // commands dir
        .mockResolvedValueOnce(['testrepo']) // user dir
        .mockResolvedValueOnce([]) // repo dir after removal (for cleanup check)
        .mockResolvedValueOnce([]); // user dir after removal (for cleanup check)

      mockedFs.stat.mockResolvedValue({ isDirectory: () => true });
      
      // Override the default pathExists mock to return true for specific paths
      mockedFs.pathExists
        .mockResolvedValueOnce(true) // commands directory exists
        .mockResolvedValueOnce(true) // test.md file exists
        .mockResolvedValue(false); // default false for other calls
        
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
        .mockResolvedValueOnce(['user1', 'user2']) // commands dir
        .mockResolvedValueOnce(['repo1']) // user1 dir
        .mockResolvedValueOnce(['repo2']) // user2 dir
        .mockResolvedValueOnce([]) // repo directory empty after removal
        .mockResolvedValueOnce([]); // user directory empty after removal

      mockedFs.stat.mockResolvedValue({ isDirectory: () => true });
      
      // Mock pathExists calls in order
      mockedFs.pathExists
        .mockResolvedValueOnce(true)  // commands directory exists
        .mockResolvedValueOnce(false) // user1/repo1/test.md doesn't exist
        .mockResolvedValueOnce(true)  // user2/repo2/test.md exists
        .mockResolvedValue(false); // default false for other calls

      mockedFs.remove.mockResolvedValue();

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

      await expect(removeCommand('test', options)).rejects.toThrow('process.exit unexpectedly called with "1"');
      expect(console.error).toHaveBeenCalledWith('No commands directory found');
    });

    test('should exit when command is not found', async () => {
      mockedConfig.loadJumonConfig.mockResolvedValue({ repositories: {} });
      mockedFs.readdir.mockResolvedValue([]);

      const options = { global: false };

      await expect(removeCommand('nonexistent', options)).rejects.toThrow('process.exit unexpectedly called with "1"');
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

      await expect(removeCommand('test', options)).rejects.toThrow('process.exit unexpectedly called with "1"');
      expect(console.error).toHaveBeenCalledWith('Error: Permission denied');
    });

    test('should handle readdir errors in filesystem search', async () => {
      mockedConfig.loadJumonConfig.mockResolvedValue({ repositories: {} });
      
      // readdir will fail, which gets caught and returns empty array,
      // so the command won't be found
      mockedFs.readdir.mockRejectedValue(new Error('Access denied'));

      const options = { global: false };

      await expect(removeCommand('test', options)).rejects.toThrow('process.exit unexpectedly called with "1"');
      // The error is caught internally and the command is just not found
      expect(console.error).toHaveBeenCalledWith("Command 'test' not found");
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