import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import { installCommand } from '../../src/commands/install.js';
import * as paths from '../../src/utils/paths.js';
import * as config from '../../src/utils/config.js';
import * as github from '../../src/utils/github.js';

// Mock dependencies
vi.mock('fs-extra');
vi.mock('../../src/utils/paths.js');
vi.mock('../../src/utils/config.js');
vi.mock('../../src/utils/github.js');

const mockedFs = vi.mocked(fs);
const mockedPaths = vi.mocked(paths);
const mockedConfig = vi.mocked(config);
const mockedGithub = vi.mocked(github);

describe('Install Command', () => {
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
    mockedPaths.ensureCommandsDir.mockResolvedValue('/test/commands');
    mockedFs.ensureDir.mockResolvedValue();
    mockedFs.writeFile.mockResolvedValue();
    mockedGithub.getFileContent.mockResolvedValue('# Test Command\nContent');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('successful installation', () => {
    test('should install commands from lock file', async () => {
      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user1/repo1': {
            revision: 'abc123',
            only: ['cmd1', 'cmd2']
          },
          'user2/repo2': {
            revision: 'def456',
            only: []
          }
        }
      };

      const mockConfig = {
        repositories: {
          'user1/repo1': {
            only: [
              { name: 'cmd1', path: 'cmd1.md', alias: null },
              { name: 'cmd2', path: 'cmd2.md', alias: null }
            ]
          },
          'user2/repo2': {
            only: []
          }
        }
      };

      mockedConfig.loadCccscLock.mockResolvedValue(mockLock);
      mockedConfig.loadCccscConfig.mockResolvedValue(mockConfig);
      
      // Mock findMarkdownFiles for repo with all commands
      mockedGithub.findMarkdownFiles.mockResolvedValue([
        { name: 'all1', path: 'all1.md' },
        { name: 'all2', path: 'all2.md' }
      ]);

      const options = { global: false };

      await installCommand(options);

      // Should install specific commands from user1/repo1
      expect(mockedGithub.getFileContent).toHaveBeenCalledWith('user1', 'repo1', 'cmd1.md', 'main');
      expect(mockedGithub.getFileContent).toHaveBeenCalledWith('user1', 'repo1', 'cmd2.md', 'main');
      
      // Should install all commands from user2/repo2
      expect(mockedGithub.findMarkdownFiles).toHaveBeenCalledWith('user2', 'repo2', '', 'main');
      expect(mockedGithub.getFileContent).toHaveBeenCalledWith('user2', 'repo2', 'all1.md', 'main');
      expect(mockedGithub.getFileContent).toHaveBeenCalledWith('user2', 'repo2', 'all2.md', 'main');

      // Should write files
      expect(mockedFs.writeFile).toHaveBeenCalledWith('/test/commands/user1/repo1/cmd1.md', '# Test Command\nContent');
      expect(mockedFs.writeFile).toHaveBeenCalledWith('/test/commands/user1/repo1/cmd2.md', '# Test Command\nContent');
      expect(mockedFs.writeFile).toHaveBeenCalledWith('/test/commands/user2/repo2/all1.md', '# Test Command\nContent');
      expect(mockedFs.writeFile).toHaveBeenCalledWith('/test/commands/user2/repo2/all2.md', '# Test Command\nContent');

      expect(consoleSpy).toHaveBeenCalledWith('✓ Installed 4 commands from 2 repositories');
    });

    test('should handle repositories with specific commands only', async () => {
      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'abc123',
            only: ['specific']
          }
        }
      };

      const mockConfig = {
        repositories: {
          'user/repo': {
            only: [
              { name: 'specific', path: 'commands/specific.md', alias: 'alias-name' }
            ]
          }
        }
      };

      mockedConfig.loadCccscLock.mockResolvedValue(mockLock);
      mockedConfig.loadCccscConfig.mockResolvedValue(mockConfig);

      const options = { global: false };

      await installCommand(options);

      expect(mockedGithub.getFileContent).toHaveBeenCalledWith('user', 'repo', 'commands/specific.md', 'main');
      expect(mockedFs.writeFile).toHaveBeenCalledWith('/test/commands/user/repo/alias-name.md', '# Test Command\nContent');
      expect(consoleSpy).toHaveBeenCalledWith('✓ Installed alias-name');
    });

    test('should handle empty lock file', async () => {
      const mockLock = {
        lockfileVersion: 1,
        repositories: {}
      };

      mockedConfig.loadCccscLock.mockResolvedValue(mockLock);

      const options = { global: false };

      await installCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('No repositories to install (cccsc-lock.json is empty or not found)');
      expect(mockedGithub.getFileContent).not.toHaveBeenCalled();
    });

    test('should install globally when --global flag is used', async () => {
      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'abc123',
            only: ['cmd']
          }
        }
      };

      const mockConfig = {
        repositories: {
          'user/repo': {
            only: [
              { name: 'cmd', path: 'cmd.md', alias: null }
            ]
          }
        }
      };

      mockedConfig.loadCccscLock.mockResolvedValue(mockLock);
      mockedConfig.loadCccscConfig.mockResolvedValue(mockConfig);

      const options = { global: true };

      await installCommand(options);

      expect(mockedPaths.ensureCommandsDir).toHaveBeenCalledWith(false);
      expect(mockedConfig.loadCccscLock).toHaveBeenCalledWith(false);
      expect(mockedConfig.loadCccscConfig).toHaveBeenCalledWith(false);
    });

    test('should handle repositories with all commands (empty only array)', async () => {
      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'abc123',
            only: []
          }
        }
      };

      const mockConfig = {
        repositories: {
          'user/repo': {
            only: []
          }
        }
      };

      mockedConfig.loadCccscLock.mockResolvedValue(mockLock);
      mockedConfig.loadCccscConfig.mockResolvedValue(mockConfig);
      mockedGithub.findMarkdownFiles.mockResolvedValue([
        { name: 'cmd1', path: 'cmd1.md' },
        { name: 'cmd2', path: 'cmd2.md' }
      ]);

      const options = { global: false };

      await installCommand(options);

      expect(mockedGithub.findMarkdownFiles).toHaveBeenCalledWith('user', 'repo', '', 'main');
      expect(mockedGithub.getFileContent).toHaveBeenCalledWith('user', 'repo', 'cmd1.md', 'main');
      expect(mockedGithub.getFileContent).toHaveBeenCalledWith('user', 'repo', 'cmd2.md', 'main');
      expect(mockedFs.writeFile).toHaveBeenCalledWith('/test/commands/user/repo/cmd1.md', '# Test Command\nContent');
      expect(mockedFs.writeFile).toHaveBeenCalledWith('/test/commands/user/repo/cmd2.md', '# Test Command\nContent');
    });

    test('should skip lock file save when skipLockFileSave option is true', async () => {
      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'abc123',
            only: ['cmd']
          }
        }
      };

      const mockConfig = {
        repositories: {
          'user/repo': {
            only: [
              { name: 'cmd', path: 'cmd.md', alias: null }
            ]
          }
        }
      };

      mockedConfig.loadCccscLock.mockResolvedValue(mockLock);
      mockedConfig.loadCccscConfig.mockResolvedValue(mockConfig);

      const options = { global: false, skipLockFileSave: true };

      await installCommand(options);

      expect(mockedConfig.saveCccscLock).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('✓ Installed cmd');
    });

    test('should save lock file by default when skipLockFileSave is not specified', async () => {
      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'abc123',
            only: ['cmd']
          }
        }
      };

      const mockConfig = {
        repositories: {
          'user/repo': {
            only: [
              { name: 'cmd', path: 'cmd.md', alias: null }
            ]
          }
        }
      };

      mockedConfig.loadCccscLock.mockResolvedValue(mockLock);
      mockedConfig.loadCccscConfig.mockResolvedValue(mockConfig);

      const options = { global: false };

      await installCommand(options);

      expect(mockedConfig.saveCccscLock).toHaveBeenCalledWith(
        expect.objectContaining({
          repositories: expect.objectContaining({
            'user/repo': expect.objectContaining({
              only: ['cmd']
            })
          })
        }),
        true
      );
    });
  });

  describe('error handling', () => {
    test('should handle GitHub API errors gracefully', async () => {
      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'abc123',
            only: ['cmd']
          }
        }
      };

      const mockConfig = {
        repositories: {
          'user/repo': {
            only: [
              { name: 'cmd', path: 'cmd.md', alias: null }
            ]
          }
        }
      };

      mockedConfig.loadCccscLock.mockResolvedValue(mockLock);
      mockedConfig.loadCccscConfig.mockResolvedValue(mockConfig);
      mockedGithub.getFileContent.mockRejectedValue(new Error('File not found'));

      const options = { global: false };

      await installCommand(options);

      expect(console.error).toHaveBeenCalledWith('✗ Failed to install cmd: File not found');
      expect(consoleSpy).toHaveBeenCalledWith('✓ Installed 0 commands from 1 repositories');
    });

    test('should handle file writing errors', async () => {
      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'abc123',
            only: ['cmd']
          }
        }
      };

      const mockConfig = {
        repositories: {
          'user/repo': {
            only: [
              { name: 'cmd', path: 'cmd.md', alias: null }
            ]
          }
        }
      };

      mockedConfig.loadCccscLock.mockResolvedValue(mockLock);
      mockedConfig.loadCccscConfig.mockResolvedValue(mockConfig);
      mockedFs.writeFile.mockRejectedValue(new Error('Permission denied'));

      const options = { global: false };

      await installCommand(options);

      expect(console.error).toHaveBeenCalledWith('✗ Failed to install cmd: Permission denied');
    });

    test('should handle findMarkdownFiles errors', async () => {
      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'abc123',
            only: []
          }
        }
      };

      const mockConfig = {
        repositories: {
          'user/repo': {
            only: []
          }
        }
      };

      mockedConfig.loadCccscLock.mockResolvedValue(mockLock);
      mockedConfig.loadCccscConfig.mockResolvedValue(mockConfig);
      mockedGithub.findMarkdownFiles.mockRejectedValue(new Error('Repository not found'));

      const options = { global: false };

      await installCommand(options);

      expect(console.error).toHaveBeenCalledWith('✗ Failed to install commands from user/repo: Repository not found');
    });

    test('should handle missing configuration', async () => {
      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'abc123',
            only: ['cmd']
          }
        }
      };

      const mockConfig = {
        repositories: {} // No config for the repository
      };

      mockedConfig.loadCccscLock.mockResolvedValue(mockLock);
      mockedConfig.loadCccscConfig.mockResolvedValue(mockConfig);

      const options = { global: false };

      await installCommand(options);

      expect(console.error).toHaveBeenCalledWith('✗ No configuration found for user/repo, skipping');
      expect(mockedGithub.getFileContent).not.toHaveBeenCalled();
    });

    test('should handle general errors', async () => {
      mockedConfig.loadCccscLock.mockRejectedValue(new Error('Lock file corrupted'));

      const options = { global: false };

      await expect(installCommand(options)).rejects.toThrow('process.exit unexpectedly called with "1"');
      expect(console.error).toHaveBeenCalledWith('Error in Install command: Lock file corrupted');
    });
  });

  describe('mixed success and failure scenarios', () => {
    test('should continue installing other commands when some fail', async () => {
      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user/repo': {
            revision: 'abc123',
            only: ['success', 'fail']
          }
        }
      };

      const mockConfig = {
        repositories: {
          'user/repo': {
            only: [
              { name: 'success', path: 'success.md', alias: null },
              { name: 'fail', path: 'fail.md', alias: null }
            ]
          }
        }
      };

      mockedConfig.loadCccscLock.mockResolvedValue(mockLock);
      mockedConfig.loadCccscConfig.mockResolvedValue(mockConfig);
      
      mockedGithub.getFileContent
        .mockResolvedValueOnce('Success content')
        .mockRejectedValueOnce(new Error('Fail error'));

      const options = { global: false };

      await installCommand(options);

      expect(mockedFs.writeFile).toHaveBeenCalledWith('/test/commands/user/repo/success.md', 'Success content');
      expect(consoleSpy).toHaveBeenCalledWith('✓ Installed success');
      expect(console.error).toHaveBeenCalledWith('✗ Failed to install fail: Fail error');
      expect(consoleSpy).toHaveBeenCalledWith('✓ Installed 1 commands from 1 repositories');
    });

    test('should handle partial repository failures', async () => {
      const mockLock = {
        lockfileVersion: 1,
        repositories: {
          'user1/repo1': {
            revision: 'abc123',
            only: ['cmd1']
          },
          'user2/repo2': {
            revision: 'def456',
            only: []
          }
        }
      };

      const mockConfig = {
        repositories: {
          'user1/repo1': {
            only: [
              { name: 'cmd1', path: 'cmd1.md', alias: null }
            ]
          },
          'user2/repo2': {
            only: []
          }
        }
      };

      mockedConfig.loadCccscLock.mockResolvedValue(mockLock);
      mockedConfig.loadCccscConfig.mockResolvedValue(mockConfig);
      
      // First repo succeeds
      mockedGithub.getFileContent.mockResolvedValueOnce('Success content');
      
      // Second repo fails
      mockedGithub.findMarkdownFiles.mockRejectedValue(new Error('Repo not found'));

      const options = { global: false };

      await installCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('✓ Installed cmd1');
      expect(console.error).toHaveBeenCalledWith('✗ Failed to install commands from user2/repo2: Repo not found');
      expect(consoleSpy).toHaveBeenCalledWith('✓ Installed 1 commands from 2 repositories');
    });
  });
});