import { jest } from '@jest/globals';
import fs from 'fs-extra';
import { listCommand } from '../../src/commands/list.js';
import * as paths from '../../src/utils/paths.js';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('../../src/utils/paths.js');

const mockedFs = fs;
const mockedPaths = paths;

describe('List Command', () => {
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console.log
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Setup default mocks
    mockedPaths.getCommandsPath.mockReturnValue('/test/commands');
    mockedFs.pathExists.mockResolvedValue(true);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('successful listing', () => {
    test('should list commands in both local and global by default', async () => {
      // Mock local commands
      mockedPaths.getCommandsPath
        .mockReturnValueOnce('/local/commands')
        .mockReturnValueOnce('/global/commands');

      mockedFs.pathExists
        .mockResolvedValueOnce(true)  // local exists
        .mockResolvedValueOnce(true); // global exists

      mockedFs.readdir
        .mockResolvedValueOnce(['user1']) // local users
        .mockResolvedValueOnce(['repo1']) // local user1 repos
        .mockResolvedValueOnce(['cmd1.md', 'cmd2.md']) // local repo1 commands
        .mockResolvedValueOnce(['user2']) // global users
        .mockResolvedValueOnce(['repo2']) // global user2 repos
        .mockResolvedValueOnce(['cmd3.md']); // global repo2 commands

      mockedFs.stat.mockResolvedValue({ isDirectory: () => true });

      const options = {};

      await listCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('📍 Local Commands (.claude/commands/)');
      expect(consoleSpy).toHaveBeenCalledWith('  /project:cmd1 (user1/repo1)');
      expect(consoleSpy).toHaveBeenCalledWith('  /project:cmd2 (user1/repo1)');
      expect(consoleSpy).toHaveBeenCalledWith('🌍 Global Commands (~/.claude/commands/)');
      expect(consoleSpy).toHaveBeenCalledWith('  /user:cmd3 (user2/repo2)');
    });

    test('should list only local commands when --local flag is used', async () => {
      mockedFs.readdir
        .mockResolvedValueOnce(['user1'])
        .mockResolvedValueOnce(['repo1'])
        .mockResolvedValueOnce(['cmd1.md']);

      mockedFs.stat.mockResolvedValue({ isDirectory: () => true });

      const options = { local: true };

      await listCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('📍 Local Commands (.claude/commands/)');
      expect(consoleSpy).toHaveBeenCalledWith('  /project:cmd1 (user1/repo1)');
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Global Commands'));
    });

    test('should list only global commands when --global flag is used', async () => {
      mockedFs.readdir
        .mockResolvedValueOnce(['user1'])
        .mockResolvedValueOnce(['repo1'])
        .mockResolvedValueOnce(['cmd1.md']);

      mockedFs.stat.mockResolvedValue({ isDirectory: () => true });

      const options = { global: true };

      await listCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('🌍 Global Commands (~/.claude/commands/)');
      expect(consoleSpy).toHaveBeenCalledWith('  /user:cmd1 (user1/repo1)');
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Local Commands'));
    });

    test('should handle multiple users and repositories', async () => {
      mockedFs.readdir
        .mockResolvedValueOnce(['user1', 'user2']) // users
        .mockResolvedValueOnce(['repo1', 'repo2']) // user1 repos
        .mockResolvedValueOnce(['cmd1.md']) // user1/repo1 commands
        .mockResolvedValueOnce(['cmd2.md']) // user1/repo2 commands
        .mockResolvedValueOnce(['repo3']) // user2 repos
        .mockResolvedValueOnce(['cmd3.md']); // user2/repo3 commands

      mockedFs.stat.mockResolvedValue({ isDirectory: () => true });

      const options = { local: true };

      await listCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('  /project:cmd1 (user1/repo1)');
      expect(consoleSpy).toHaveBeenCalledWith('  /project:cmd2 (user1/repo2)');
      expect(consoleSpy).toHaveBeenCalledWith('  /project:cmd3 (user2/repo3)');
    });

    test('should filter out non-markdown files', async () => {
      mockedFs.readdir
        .mockResolvedValueOnce(['user1'])
        .mockResolvedValueOnce(['repo1'])
        .mockResolvedValueOnce(['cmd1.md', 'readme.txt', 'cmd2.md', '.hidden']);

      mockedFs.stat.mockResolvedValue({ isDirectory: () => true });

      const options = { local: true };

      await listCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('  /project:cmd1 (user1/repo1)');
      expect(consoleSpy).toHaveBeenCalledWith('  /project:cmd2 (user1/repo1)');
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('readme'));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('hidden'));
    });

    test('should handle repositories with no markdown files', async () => {
      mockedFs.readdir
        .mockResolvedValueOnce(['user1'])
        .mockResolvedValueOnce(['repo1', 'repo2'])
        .mockResolvedValueOnce([]) // repo1 empty
        .mockResolvedValueOnce(['cmd1.md']); // repo2 has commands

      mockedFs.stat.mockResolvedValue({ isDirectory: () => true });

      const options = { local: true };

      await listCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('  /project:cmd1 (user1/repo2)');
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('user1/repo1'));
    });
  });

  describe('empty directories handling', () => {
    test('should show message when no commands are found in local', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      const options = { local: true };

      await listCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('📍 Local Commands (.claude/commands/)');
      expect(consoleSpy).toHaveBeenCalledWith('  No commands found');
    });

    test('should show message when no commands are found in global', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      const options = { global: true };

      await listCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('🌍 Global Commands (~/.claude/commands/)');
      expect(consoleSpy).toHaveBeenCalledWith('  No commands found');
    });

    test('should handle empty commands directory', async () => {
      mockedFs.readdir.mockResolvedValue([]);

      const options = { local: true };

      await listCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('📍 Local Commands (.claude/commands/)');
      expect(consoleSpy).toHaveBeenCalledWith('  No commands found');
    });

    test('should handle users with no repositories', async () => {
      mockedFs.readdir
        .mockResolvedValueOnce(['user1'])
        .mockResolvedValueOnce([]); // user1 has no repos

      mockedFs.stat.mockResolvedValue({ isDirectory: () => true });

      const options = { local: true };

      await listCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('📍 Local Commands (.claude/commands/)');
      expect(consoleSpy).toHaveBeenCalledWith('  No commands found');
    });
  });

  describe('error handling', () => {
    test('should handle readdir errors gracefully', async () => {
      mockedFs.readdir.mockRejectedValue(new Error('Permission denied'));

      const options = { local: true };

      await listCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('📍 Local Commands (.claude/commands/)');
      expect(consoleSpy).toHaveBeenCalledWith('  No commands found');
    });

    test('should handle stat errors for individual entries', async () => {
      mockedFs.readdir
        .mockResolvedValueOnce(['user1', 'invalidentry'])
        .mockResolvedValueOnce(['repo1'])
        .mockResolvedValueOnce(['cmd1.md']);

      mockedFs.stat
        .mockResolvedValueOnce({ isDirectory: () => true })  // user1 is directory
        .mockRejectedValueOnce(new Error('Stat failed'))    // invalidentry fails
        .mockResolvedValueOnce({ isDirectory: () => true }); // repo1 is directory

      const options = { local: true };

      await listCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('  /project:cmd1 (user1/repo1)');
      // Should not crash on the invalid entry
    });

    test('should handle readdir errors for specific repositories', async () => {
      mockedFs.readdir
        .mockResolvedValueOnce(['user1'])
        .mockResolvedValueOnce(['repo1'])
        .mockRejectedValueOnce(new Error('Cannot read repo'));

      mockedFs.stat.mockResolvedValue({ isDirectory: () => true });

      const options = { local: true };

      await listCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('📍 Local Commands (.claude/commands/)');
      expect(consoleSpy).toHaveBeenCalledWith('  No commands found');
    });

    test('should handle mixed file types in user directories', async () => {
      mockedFs.readdir
        .mockResolvedValueOnce(['user1', 'somefile.txt'])
        .mockResolvedValueOnce(['repo1'])
        .mockResolvedValueOnce(['cmd1.md']);

      mockedFs.stat
        .mockResolvedValueOnce({ isDirectory: () => true })  // user1 is directory
        .mockResolvedValueOnce({ isDirectory: () => false }) // somefile.txt is file
        .mockResolvedValueOnce({ isDirectory: () => true }); // repo1 is directory

      const options = { local: true };

      await listCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('  /project:cmd1 (user1/repo1)');
      // Should skip the file in the commands directory
    });
  });

  describe('both local and global', () => {
    test('should show both when neither flag is specified', async () => {
      mockedPaths.getCommandsPath
        .mockReturnValueOnce('/local/commands')
        .mockReturnValueOnce('/global/commands');

      mockedFs.pathExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      mockedFs.readdir
        .mockResolvedValueOnce(['user1'])
        .mockResolvedValueOnce(['repo1'])
        .mockResolvedValueOnce(['local.md'])
        .mockResolvedValueOnce(['user2'])
        .mockResolvedValueOnce(['repo2'])
        .mockResolvedValueOnce(['global.md']);

      mockedFs.stat.mockResolvedValue({ isDirectory: () => true });

      const options = {};

      await listCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('📍 Local Commands (.claude/commands/)');
      expect(consoleSpy).toHaveBeenCalledWith('  /project:local (user1/repo1)');
      expect(consoleSpy).toHaveBeenCalledWith('🌍 Global Commands (~/.claude/commands/)');
      expect(consoleSpy).toHaveBeenCalledWith('  /user:global (user2/repo2)');
    });

    test('should handle when only local has commands', async () => {
      mockedPaths.getCommandsPath
        .mockReturnValueOnce('/local/commands')
        .mockReturnValueOnce('/global/commands');

      mockedFs.pathExists
        .mockResolvedValueOnce(true)  // local exists
        .mockResolvedValueOnce(false); // global doesn't exist

      mockedFs.readdir
        .mockResolvedValueOnce(['user1'])
        .mockResolvedValueOnce(['repo1'])
        .mockResolvedValueOnce(['local.md']);

      mockedFs.stat.mockResolvedValue({ isDirectory: () => true });

      const options = {};

      await listCommand(options);

      expect(consoleSpy).toHaveBeenCalledWith('📍 Local Commands (.claude/commands/)');
      expect(consoleSpy).toHaveBeenCalledWith('  /project:local (user1/repo1)');
      expect(consoleSpy).toHaveBeenCalledWith('🌍 Global Commands (~/.claude/commands/)');
      expect(consoleSpy).toHaveBeenCalledWith('  No commands found');
    });
  });
});