import { jest } from '@jest/globals';
import axios from 'axios';
import fs from 'fs-extra';
import { createInterface } from 'readline';
import { updateCommand } from '../../src/commands/update.js';
import * as github from '../../src/utils/github.js';
import * as paths from '../../src/utils/paths.js';
import * as config from '../../src/utils/config.js';

// Mock dependencies
jest.mock('axios');
jest.mock('fs-extra');
jest.mock('readline');
jest.mock('../../src/utils/github.js');
jest.mock('../../src/utils/paths.js');
jest.mock('../../src/utils/config.js');

const mockedAxios = axios;
const mockedFs = fs;
const mockedGithub = github;
const mockedPaths = paths;
const mockedConfig = config;
const mockedReadline = createInterface;

describe('Update Command', () => {
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
        question: jest.fn((question, callback) => callback('y')),
        close: jest.fn()
      };
      mockedReadline.mockReturnValue(mockRl);

      const options = { global: false };

      await updateCommand(options);

      expect(mockedGithub.getLatestCommitHash).toHaveBeenCalledWith('user', 'repo', 'main');
      expect(mockedGithub.getFileContent).toHaveBeenCalledWith('user', 'repo', 'cmd1.md');
      expect(mockedFs.writeFile).toHaveBeenCalledWith('/test/commands/user/repo/cmd1.md', 'new content');
      expect(consoleSpy).toHaveBeenCalledWith('🎉 Update complete!');
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
        question: jest.fn((question, callback) => callback('y')),
        close: jest.fn()
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
      expect(consoleSpy).toHaveBeenCalledWith('🎉 All repositories are up to date!');
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
        question: jest.fn((question, callback) => callback('y')),
        close: jest.fn()
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
        question: jest.fn((question, callback) => callback('y')),
        close: jest.fn()
      };
      mockedReadline.mockReturnValue(mockRl);

      const options = { global: false };

      await updateCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('📋 Detailed changes preview:');
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
        question: jest.fn((question, callback) => callback('n')),
        close: jest.fn()
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

      expect(consoleSpy).toHaveBeenCalledWith('Applying updates...');
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

      await updateCommand(options);

      expect(processExitSpy).toHaveBeenCalledWith(1);
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
        question: jest.fn((question, callback) => callback('y')),
        close: jest.fn()
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
      expect(mockedPaths.ensureCommandsDir).toHaveBeenCalledWith(false);
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