import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import { createInterface } from 'readline';
import { addCommand } from '../../src/commands/add.js';
import * as github from '../../src/utils/github.js';
import * as paths from '../../src/utils/paths.js';
import * as config from '../../src/utils/config.js';

// Mock all dependencies
vi.mock('fs-extra');
vi.mock('readline');
vi.mock('../../src/utils/github.js');
vi.mock('../../src/utils/paths.js');
vi.mock('../../src/utils/config.js');

const mockedFs = vi.mocked(fs);
const mockedGithub = vi.mocked(github);
const mockedPaths = vi.mocked(paths);
const mockedConfig = vi.mocked(config);
const mockedReadline = vi.mocked(createInterface);

describe('Add Command', () => {
  let consoleSpy;
  let processExitSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console.log and console.error
    consoleSpy = vi.spyOn(console, 'log').mockImplementation();
    vi.spyOn(console, 'error').mockImplementation();
    
    // Mock process.exit
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation();
    
    // Setup default mocks
    mockedGithub.parseRepositoryPath.mockReturnValue({
      user: 'testuser',
      repo: 'testrepo',
      commandPath: 'test.md'
    });
    
    mockedPaths.ensureCommandsDir.mockResolvedValue('/test/commands');
    mockedFs.ensureDir.mockResolvedValue();
    mockedFs.readdir.mockResolvedValue([]);
    mockedFs.pathExists.mockResolvedValue(false);
    mockedFs.writeFile.mockResolvedValue();
    
    mockedGithub.getFileContent.mockResolvedValue('# Test Command\nTest content');
    mockedGithub.getLatestCommitHash.mockResolvedValue('abc123def456');
    mockedGithub.resolveRepositoryRevision.mockResolvedValue('abc123def456');
    
    mockedConfig.loadCccscConfig.mockResolvedValue({ repositories: {} });
    mockedConfig.addRepositoryToConfig.mockResolvedValue();
    mockedConfig.addRepositoryToLock.mockResolvedValue();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('successful scenarios', () => {
    test('should add specific command successfully', async () => {
      const options = { global: false };

      await addCommand('testuser/testrepo/test', options);

      expect(mockedGithub.parseRepositoryPath).toHaveBeenCalledWith('testuser/testrepo/test');
      expect(mockedPaths.ensureCommandsDir).toHaveBeenCalledWith(true);
      expect(mockedGithub.getFileContent).toHaveBeenCalledWith('testuser', 'testrepo', 'test.md', 'main');
      expect(mockedFs.writeFile).toHaveBeenCalledWith('/test/commands/testuser/testrepo/test.md', '# Test Command\nTest content');
      expect(mockedConfig.addRepositoryToConfig).toHaveBeenCalledWith('testuser', 'testrepo', 'test.md', undefined, 'main', true);
      expect(consoleSpy).toHaveBeenCalledWith('Adding testuser/testrepo/test...');
      expect(consoleSpy).toHaveBeenCalledWith('✓ Successfully added test');
      expect(consoleSpy).toHaveBeenCalledWith('Repository: testuser/testrepo @ abc123d');
      expect(consoleSpy).toHaveBeenCalledWith('Installed to: /test/commands/testuser/testrepo/test.md');
    });

    test('should add command with alias', async () => {
      const options = { global: false, alias: 'custom-name' };

      await addCommand('testuser/testrepo/test', options);

      expect(mockedConfig.addRepositoryToConfig).toHaveBeenCalledWith('testuser', 'testrepo', 'test.md', 'custom-name', 'main', true);
      expect(consoleSpy).toHaveBeenCalledWith('Adding testuser/testrepo/test...');
      expect(consoleSpy).toHaveBeenCalledWith('✓ Successfully added custom-name');
      expect(consoleSpy).toHaveBeenCalledWith('Repository: testuser/testrepo @ abc123d');
      expect(consoleSpy).toHaveBeenCalledWith('Installed to: /test/commands/testuser/testrepo/custom-name.md');
    });

    test('should add command globally', async () => {
      const options = { global: true };

      await addCommand('testuser/testrepo/test', options);

      expect(mockedPaths.ensureCommandsDir).toHaveBeenCalledWith(false);
      expect(mockedConfig.addRepositoryToConfig).toHaveBeenCalledWith('testuser', 'testrepo', 'test.md', undefined, 'main', false);
    });


    test('should add command with branch constraint', async () => {
      const options = { global: false, branch: 'develop' };

      await addCommand('testuser/testrepo/test', options);

      expect(mockedGithub.getFileContent).toHaveBeenCalledWith('testuser', 'testrepo', 'test.md', 'develop');
      expect(mockedConfig.addRepositoryToConfig).toHaveBeenCalledWith('testuser', 'testrepo', 'test.md', undefined, 'develop', true);
    });

    test('should add all commands from repository', async () => {
      mockedGithub.parseRepositoryPath.mockReturnValue({
        user: 'testuser',
        repo: 'testrepo',
        commandPath: null
      });
      
      mockedGithub.findMarkdownFiles.mockResolvedValue([
        { name: 'command1', path: 'command1.md' },
        { name: 'command2', path: 'command2.md' }
      ]);

      const options = { global: false };

      await addCommand('testuser/testrepo', options);

      expect(mockedGithub.findMarkdownFiles).toHaveBeenCalledWith('testuser', 'testrepo', '', 'main');
      expect(mockedGithub.getFileContent).toHaveBeenCalledTimes(2);
      expect(mockedFs.writeFile).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith('Installing 2 commands...');
      expect(consoleSpy).toHaveBeenCalledWith('✓ Installed command1');
      expect(consoleSpy).toHaveBeenCalledWith('✓ Installed command2');
    });
  });

  describe('conflict handling', () => {
    test('should handle command name conflicts without alias', async () => {
      mockedFs.readdir.mockResolvedValue(['existing']);
      mockedFs.stat.mockResolvedValue({ isDirectory: () => true });
      
      // First call returns subdirectory, second call returns conflicting file
      mockedFs.readdir
        .mockResolvedValueOnce(['existing'])
        .mockResolvedValueOnce(['test.md']);

      const options = { global: false };

      await expect(addCommand('testuser/testrepo/test', options)).rejects.toThrow('process.exit unexpectedly called with "1"');

      expect(console.error).toHaveBeenCalledWith("Error: Command 'test' already exists at /test/commands/existing/test.md");
    });

    test('should allow command conflicts with alias', async () => {
      mockedFs.readdir.mockResolvedValue(['existing']);
      mockedFs.stat.mockResolvedValue({ isDirectory: () => true });
      mockedFs.readdir
        .mockResolvedValueOnce(['existing'])
        .mockResolvedValueOnce(['test.md']);

      const options = { global: false, alias: 'unique-name' };

      await addCommand('testuser/testrepo/test', options);

      expect(processExitSpy).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Adding testuser/testrepo/test...');
      expect(consoleSpy).toHaveBeenCalledWith('✓ Successfully added unique-name');
      expect(consoleSpy).toHaveBeenCalledWith('Repository: testuser/testrepo @ abc123d');
      expect(consoleSpy).toHaveBeenCalledWith('Installed to: /test/commands/testuser/testrepo/unique-name.md');
    });

    test('should handle repository configuration conflicts with user confirmation', async () => {
      mockedConfig.loadCccscConfig.mockResolvedValue({
        repositories: {
          'testuser/testrepo': {
            only: []
          }
        }
      });

      // Mock readline to simulate user saying 'yes'
      const mockRl = {
        question: vi.fn((question, callback) => callback('y')),
        close: vi.fn()
      };
      mockedReadline.mockReturnValue(mockRl);

      const options = { global: false };

      await addCommand('testuser/testrepo/test', options);

      expect(mockRl.question).toHaveBeenCalledWith('\n⚠️  Repository testuser/testrepo is already configured to install ALL commands. Do you want to change it to install only the specific command \'test\'?\nContinue? (y/N): ', expect.any(Function));
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    test('should cancel on repository configuration conflict when user declines', async () => {
      mockedConfig.loadCccscConfig.mockResolvedValue({
        repositories: {
          'testuser/testrepo': {
            only: []
          }
        }
      });

      const mockRl = {
        question: vi.fn((question, callback) => callback('n')),
        close: vi.fn()
      };
      mockedReadline.mockReturnValue(mockRl);

      const options = { global: false };

      await addCommand('testuser/testrepo/test', options);

      expect(consoleSpy).toHaveBeenCalledWith('Operation cancelled.');
      expect(mockedGithub.getFileContent).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should handle GitHub API errors', async () => {
      mockedGithub.getFileContent.mockRejectedValue(new Error('File not found'));

      const options = { global: false };

      await expect(addCommand('testuser/testrepo/test', options)).rejects.toThrow('process.exit unexpectedly called with "1"');
      expect(console.error).toHaveBeenCalledWith('Error: File not found');
    });

    test('should handle nonexistent branch error', async () => {
      mockedGithub.getFileContent.mockRejectedValue(new Error('Repository testuser/testrepo not found, path test.md does not exist, or branch \'nonexistent\' does not exist'));

      const options = { global: false, branch: 'nonexistent' };

      await expect(addCommand('testuser/testrepo/test', options)).rejects.toThrow('process.exit unexpectedly called with "1"');
      expect(console.error).toHaveBeenCalledWith('Error: Repository testuser/testrepo not found, path test.md does not exist, or branch \'nonexistent\' does not exist');
    });

    test('should handle empty repository', async () => {
      mockedGithub.parseRepositoryPath.mockReturnValue({
        user: 'testuser',
        repo: 'testrepo',
        commandPath: null
      });
      
      mockedGithub.findMarkdownFiles.mockResolvedValue([]);

      const options = { global: false };

      await expect(addCommand('testuser/testrepo', options)).rejects.toThrow('process.exit unexpectedly called with "1"');
      expect(console.error).toHaveBeenCalledWith('No markdown files found in testuser/testrepo');
    });

    test('should handle conflicts when installing all commands', async () => {
      mockedGithub.parseRepositoryPath.mockReturnValue({
        user: 'testuser',
        repo: 'testrepo',
        commandPath: null
      });
      
      mockedGithub.findMarkdownFiles.mockResolvedValue([
        { name: 'command1', path: 'command1.md' }
      ]);

      mockedFs.readdir.mockResolvedValue(['existing']);
      mockedFs.stat.mockResolvedValue({ isDirectory: () => true });
      mockedFs.readdir
        .mockResolvedValueOnce(['existing'])
        .mockResolvedValueOnce(['command1.md']);

      const options = { global: false };

      await expect(addCommand('testuser/testrepo', options)).rejects.toThrow('process.exit unexpectedly called with "1"');
      expect(console.error).toHaveBeenCalledWith('Error: The following commands already exist:');
    });

    test('should handle file system errors gracefully', async () => {
      mockedFs.writeFile.mockRejectedValue(new Error('Permission denied'));

      const options = { global: false };

      await expect(addCommand('testuser/testrepo/test', options)).rejects.toThrow('process.exit unexpectedly called with "1"');
      expect(console.error).toHaveBeenCalledWith('Error: Permission denied');
    });

    test('should handle nonexistent branch when installing all commands', async () => {
      mockedGithub.parseRepositoryPath.mockReturnValue({
        user: 'testuser',
        repo: 'testrepo',
        commandPath: null
      });
      
      mockedGithub.findMarkdownFiles.mockRejectedValue(new Error('Repository testuser/testrepo not found, path  does not exist, or branch \'feature\' does not exist'));

      const options = { global: false, branch: 'feature' };

      await expect(addCommand('testuser/testrepo', options)).rejects.toThrow('process.exit unexpectedly called with "1"');
      expect(console.error).toHaveBeenCalledWith('Error: Repository testuser/testrepo not found, path  does not exist, or branch \'feature\' does not exist');
    });
  });

  describe('command path handling', () => {
    test('should handle .md extension in command path', async () => {
      mockedGithub.parseRepositoryPath.mockReturnValue({
        user: 'testuser',
        repo: 'testrepo',
        commandPath: 'test.md'
      });

      const options = { global: false };

      await addCommand('testuser/testrepo/test.md', options);

      expect(mockedGithub.getFileContent).toHaveBeenCalledWith('testuser', 'testrepo', 'test.md', 'main');
    });

    test('should add .md extension when missing', async () => {
      mockedGithub.parseRepositoryPath.mockReturnValue({
        user: 'testuser',
        repo: 'testrepo',
        commandPath: 'test'
      });

      const options = { global: false };

      await addCommand('testuser/testrepo/test', options);

      expect(mockedGithub.getFileContent).toHaveBeenCalledWith('testuser', 'testrepo', 'test.md', 'main');
    });
  });
});