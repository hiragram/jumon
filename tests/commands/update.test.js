import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import fs from 'fs-extra';
import { createInterface } from 'readline';
import { updateCommand } from '../../src/commands/update.js';
import * as github from '../../src/utils/github.js';
import * as paths from '../../src/utils/paths.js';
import * as config from '../../src/utils/config.js';

// Mock dependencies
vi.mock('axios');
vi.mock('fs-extra');
vi.mock('readline');
vi.mock('../../src/utils/github.js');
vi.mock('../../src/utils/paths.js');
vi.mock('../../src/utils/config.js');

const mockedAxios = vi.mocked(axios);
const mockedFs = vi.mocked(fs);
const mockedGithub = vi.mocked(github);
const mockedPaths = vi.mocked(paths);
const mockedConfig = vi.mocked(config);
const mockedReadline = vi.mocked(createInterface);

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
    mockedFs.readFile.mockResolvedValue('old content');
    mockedFs.writeFile.mockResolvedValue();
    mockedFs.ensureDir.mockResolvedValue();
    mockedGithub.getLatestCommitHash.mockResolvedValue('newcommit123');
    mockedGithub.getFileContent.mockResolvedValue('new content');
    mockedConfig.saveJumonLock.mockResolvedValue();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('successful update scenarios', () => {
    test('should update repositories with newer commits', async () => {
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

      // Mock user confirmation
      const mockRl = {
        question: vi.fn((question, callback) => callback('y')),
        close: vi.fn()
      };
      mockedReadline.mockReturnValue(mockRl);

      const options = { global: false };

      await updateCommand(options);

      expect(mockedGithub.getLatestCommitHash).toHaveBeenCalledWith('user', 'repo', 'main');
      expect(mockedGithub.getFileContent).toHaveBeenCalledWith('user', 'repo', 'cmd1.md');
      expect(mockedFs.writeFile).toHaveBeenCalledWith('/test/commands/user/repo/cmd1.md', 'new content');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🎉 Update complete!'));
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

      // Mock tag resolution
      mockedAxios.get.mockResolvedValue({
        data: { object: { sha: 'tagcommit123' } }
      });

      mockedGithub.findMarkdownFiles.mockResolvedValue([
        { name: 'cmd', path: 'cmd.md' }
      ]);

      const mockRl = {
        question: vi.fn((question, callback) => callback('y')),
        close: vi.fn()
      };
      mockedReadline.mockReturnValue(mockRl);

      const options = { global: false };

      await updateCommand(options);

      expect(mockedAxios.get).toHaveBeenCalledWith('https://api.github.com/repos/user/repo/git/refs/tags/1.0.0');
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

      mockedAxios.get.mockResolvedValue({
        data: { object: { sha: 'tagcommit456' } }
      });

      mockedGithub.findMarkdownFiles.mockResolvedValue([]);

      const options = { global: false };

      await updateCommand(options);

      expect(mockedAxios.get).toHaveBeenCalledWith('https://api.github.com/repos/user/repo/git/refs/tags/v2.0.0');
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

      expect(consoleSpy).toHaveBeenCalledWith('  Already up to date (newcomm)');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🎉 All repositories are up to date!'));
      expect(mockedGithub.getFileContent).not.toHaveBeenCalled();
    });

    test('should update lock file even when no file changes', async () => {
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

      // Mock same content (no changes)
      mockedGithub.getFileContent.mockResolvedValue('old content');

      const options = { global: false };

      await updateCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('  No file changes detected');
      expect(mockedConfig.saveJumonLock).toHaveBeenCalled();
    });

    test('should handle all-commands repositories', async () => {
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
            revision: 'oldcommit123',
            only: []
          }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedConfig.loadJumonLock.mockResolvedValue(mockLock);

      mockedGithub.findMarkdownFiles.mockResolvedValue([
        { name: 'cmd1', path: 'cmd1.md' },
        { name: 'cmd2', path: 'cmd2.md' }
      ]);

      const mockRl = {
        question: vi.fn((question, callback) => callback('y')),
        close: vi.fn()
      };
      mockedReadline.mockReturnValue(mockRl);

      const options = { global: false };

      await updateCommand(options);

      expect(mockedGithub.findMarkdownFiles).toHaveBeenCalledWith('user', 'repo');
      expect(mockedGithub.getFileContent).toHaveBeenCalledWith('user', 'repo', 'cmd1.md');
      expect(mockedGithub.getFileContent).toHaveBeenCalledWith('user', 'repo', 'cmd2.md');
    });
  });

  describe('diff preview and confirmation', () => {
    test('should show diff preview and ask for confirmation', async () => {
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

      mockedFs.readFile.mockResolvedValue('old line 1\nold line 2');
      mockedGithub.getFileContent.mockResolvedValue('new line 1\nnew line 2');

      const mockRl = {
        question: vi.fn((question, callback) => callback('y')),
        close: vi.fn()
      };
      mockedReadline.mockReturnValue(mockRl);

      const options = { global: false };

      await updateCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📋 Detailed changes preview:'));
      expect(mockRl.question).toHaveBeenCalledWith('Apply these changes? (y/N): ', expect.any(Function));
    });

    test('should cancel update when user declines confirmation', async () => {
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

      const mockRl = {
        question: vi.fn((question, callback) => callback('n')),
        close: vi.fn()
      };
      mockedReadline.mockReturnValue(mockRl);

      const options = { global: false };

      await updateCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('Update cancelled.');
      expect(mockedFs.writeFile).not.toHaveBeenCalled();
      expect(mockedConfig.saveJumonLock).not.toHaveBeenCalled();
    });

    test('should proceed without confirmation when no file changes', async () => {
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
            revision: 'oldcommit123',
            only: []
          }
        }
      };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedConfig.loadJumonLock.mockResolvedValue(mockLock);

      mockedGithub.findMarkdownFiles.mockResolvedValue([]);

      const options = { global: false };

      await updateCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Applying updates...'));
      expect(mockedConfig.saveJumonLock).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should handle empty configuration', async () => {
      mockedConfig.loadJumonConfig.mockResolvedValue({ repositories: {} });
      mockedConfig.loadJumonLock.mockResolvedValue({ lockfileVersion: 1, repositories: {} });

      const options = { global: false };

      await updateCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('No repositories to update (jumon.json is empty or not found)');
    });

    test('should handle GitHub API errors during revision resolution', async () => {
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

      mockedAxios.get.mockRejectedValue(new Error('Tag not found'));
      mockedGithub.getLatestCommitHash.mockResolvedValue('fallbackcommit456');

      const options = { global: false };

      await updateCommand(options);

      expect(console.warn).toHaveBeenCalledWith('Failed to resolve version 1.0.0 for user/repo, falling back to latest commit');
      expect(mockedGithub.getLatestCommitHash).toHaveBeenCalledWith('user', 'repo');
    });

    test('should handle file content fetch errors', async () => {
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

      mockedGithub.getFileContent.mockRejectedValue(new Error('File not found'));

      const options = { global: false };

      await updateCommand(options);

      expect(console.error).toHaveBeenCalledWith('✗ Failed to preview cmd1: File not found');
      expect(mockedConfig.saveJumonLock).toHaveBeenCalled(); // Should still update lock
    });

    test('should handle general errors', async () => {
      mockedConfig.loadJumonConfig.mockRejectedValue(new Error('Config corrupted'));

      const options = { global: false };

      await expect(updateCommand(options)).rejects.toThrow('process.exit unexpectedly called with "1"');
      expect(console.error).toHaveBeenCalledWith('Error: Config corrupted');
    });

    test('should handle file writing errors during update application', async () => {
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

      const mockRl = {
        question: vi.fn((question, callback) => callback('y')),
        close: vi.fn()
      };
      mockedReadline.mockReturnValue(mockRl);

      mockedFs.writeFile.mockRejectedValue(new Error('Permission denied'));

      const options = { global: false };

      await updateCommand(options);

      expect(console.error).toHaveBeenCalledWith('✗ Failed to update cmd1: Permission denied');
    });
  });

  describe('global vs local', () => {
    test('should handle global update', async () => {
      const mockConfig = { repositories: {} };
      const mockLock = { lockfileVersion: 1, repositories: {} };

      mockedConfig.loadJumonConfig.mockResolvedValue(mockConfig);
      mockedConfig.loadJumonLock.mockResolvedValue(mockLock);

      const options = { global: true };

      await updateCommand(options);

      expect(mockedConfig.loadJumonConfig).toHaveBeenCalledWith(false);
      expect(mockedConfig.loadJumonLock).toHaveBeenCalledWith(false);
      // ensureCommandsDir is not called when there are no repositories to update
      expect(consoleSpy).toHaveBeenCalledWith('No repositories to update (jumon.json is empty or not found)');
    });
  });

  describe('version constraint resolution', () => {
    test('should handle version with operators', async () => {
      const mockConfig = {
        repositories: {
          'user/repo': {
            version: '~> 1.2.0',
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

      mockedAxios.get.mockResolvedValue({
        data: { object: { sha: 'versioncommit123' } }
      });

      mockedGithub.findMarkdownFiles.mockResolvedValue([]);

      const options = { global: false };

      await updateCommand(options);

      expect(mockedAxios.get).toHaveBeenCalledWith('https://api.github.com/repos/user/repo/git/refs/tags/1.2.0');
    });

    test('should fallback to latest commit when tag resolution fails', async () => {
      const mockConfig = {
        repositories: {
          'user/repo': {
            tag: 'nonexistent',
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

      mockedAxios.get.mockRejectedValue(new Error('Tag not found'));
      mockedGithub.getLatestCommitHash.mockResolvedValue('fallbackcommit789');

      mockedGithub.findMarkdownFiles.mockResolvedValue([]);

      const options = { global: false };

      await updateCommand(options);

      expect(console.warn).toHaveBeenCalledWith('Failed to resolve tag nonexistent for user/repo, falling back to latest commit');
      expect(mockedGithub.getLatestCommitHash).toHaveBeenCalledWith('user', 'repo');
    });
  });
});