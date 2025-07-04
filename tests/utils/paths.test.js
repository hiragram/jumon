import { describe, test, expect, beforeEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import {
  getGlobalCommandsPath,
  getLocalCommandsPath,
  getCommandsPath,
  getCccscConfigPath,
  getCccscLockPath,
  checkClaudeDir,
  ensureCommandsDir,
  ensureCccscConfigDir
} from '../../src/utils/paths.js';

// Mock fs-extra, os, and path
vi.mock('fs-extra');
vi.mock('os');
vi.mock('path');

const mockedFs = vi.mocked(fs);
const mockedOs = vi.mocked(os);
const mockedPath = vi.mocked(path);

describe('Paths Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockedOs.homedir.mockReturnValue('/home/user');
    vi.spyOn(path, 'join').mockImplementation((...args) => args.join('/'));
    process.cwd = vi.fn().mockReturnValue('/current/dir');
  });

  describe('getGlobalCommandsPath', () => {
    test('should return global commands path', () => {
      const result = getGlobalCommandsPath();
      
      expect(result).toBe('/home/user/.claude/commands/cccsc');
      expect(mockedOs.homedir).toHaveBeenCalled();
      expect(mockedPath.join).toHaveBeenCalledWith('/home/user', '.claude', 'commands', 'cccsc');
    });
  });

  describe('getLocalCommandsPath', () => {
    test('should return local commands path', () => {
      const result = getLocalCommandsPath();
      
      expect(result).toBe('/current/dir/.claude/commands/cccsc');
      expect(mockedPath.join).toHaveBeenCalledWith('/current/dir', '.claude', 'commands', 'cccsc');
    });
  });

  describe('getCommandsPath', () => {
    test('should return local path when isLocal is true', () => {
      const result = getCommandsPath(true);
      
      expect(result).toBe('/current/dir/.claude/commands/cccsc');
    });

    test('should return global path when isLocal is false', () => {
      const result = getCommandsPath(false);
      
      expect(result).toBe('/home/user/.claude/commands/cccsc');
    });

    test('should return global path by default', () => {
      const result = getCommandsPath();
      
      expect(result).toBe('/home/user/.claude/commands/cccsc');
    });
  });

  describe('getCccscConfigPath', () => {
    test('should return local config path when isLocal is true', () => {
      const result = getCccscConfigPath(true);
      
      expect(result).toBe('/current/dir/cccsc.json');
      expect(mockedPath.join).toHaveBeenCalledWith('/current/dir', 'cccsc.json');
    });

    test('should return global config path when isLocal is false', () => {
      const result = getCccscConfigPath(false);
      
      expect(result).toBe('/home/user/.cccsc/cccsc.json');
      expect(mockedPath.join).toHaveBeenCalledWith('/home/user', '.cccsc', 'cccsc.json');
    });

    test('should return global config path by default', () => {
      const result = getCccscConfigPath();
      
      expect(result).toBe('/home/user/.cccsc/cccsc.json');
    });
  });

  describe('getCccscLockPath', () => {
    test('should return local lock path when isLocal is true', () => {
      const result = getCccscLockPath(true);
      
      expect(result).toBe('/current/dir/cccsc-lock.json');
      expect(mockedPath.join).toHaveBeenCalledWith('/current/dir', 'cccsc-lock.json');
    });

    test('should return global lock path when isLocal is false', () => {
      const result = getCccscLockPath(false);
      
      expect(result).toBe('/home/user/.cccsc/cccsc-lock.json');
      expect(mockedPath.join).toHaveBeenCalledWith('/home/user', '.cccsc', 'cccsc-lock.json');
    });
  });

  describe('checkClaudeDir', () => {
    test('should return local Claude directory when it exists', async () => {
      mockedFs.pathExists.mockResolvedValue(true);

      const result = await checkClaudeDir(true);
      
      expect(result).toBe('/current/dir/.claude');
      expect(mockedFs.pathExists).toHaveBeenCalledWith('/current/dir/.claude');
    });

    test('should return global Claude directory when it exists', async () => {
      mockedFs.pathExists.mockResolvedValue(true);

      const result = await checkClaudeDir(false);
      
      expect(result).toBe('/home/user/.claude');
      expect(mockedFs.pathExists).toHaveBeenCalledWith('/home/user/.claude');
    });

    test('should throw error when local Claude directory does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      await expect(checkClaudeDir(true))
        .rejects.toThrow('Claude Code directory not found in current directory. Please ensure .claude directory exists.');
    });

    test('should throw error when global Claude directory does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      await expect(checkClaudeDir(false))
        .rejects.toThrow('Claude Code directory not found in home directory. Please ensure .claude directory exists.');
    });
  });

  describe('ensureCommandsDir', () => {
    test('should ensure local commands directory exists', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.ensureDir.mockResolvedValue();

      const result = await ensureCommandsDir(true);
      
      expect(result).toBe('/current/dir/.claude/commands/cccsc');
      expect(mockedFs.pathExists).toHaveBeenCalledWith('/current/dir/.claude');
      expect(mockedFs.ensureDir).toHaveBeenCalledWith('/current/dir/.claude/commands/cccsc');
    });

    test('should ensure global commands directory exists', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.ensureDir.mockResolvedValue();

      const result = await ensureCommandsDir(false);
      
      expect(result).toBe('/home/user/.claude/commands/cccsc');
      expect(mockedFs.pathExists).toHaveBeenCalledWith('/home/user/.claude');
      expect(mockedFs.ensureDir).toHaveBeenCalledWith('/home/user/.claude/commands/cccsc');
    });

    test('should throw error if Claude directory check fails', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      await expect(ensureCommandsDir(true))
        .rejects.toThrow('Claude Code directory not found in current directory. Please ensure .claude directory exists.');
    });
  });

  describe('ensureCccscConfigDir', () => {
    test('should not create directory for local config', async () => {
      await ensureCccscConfigDir(true);
      
      expect(mockedFs.ensureDir).not.toHaveBeenCalled();
    });

    test('should ensure global cccsc directory exists', async () => {
      mockedFs.ensureDir.mockResolvedValue();

      await ensureCccscConfigDir(false);
      
      expect(mockedFs.ensureDir).toHaveBeenCalledWith('/home/user/.cccsc');
    });

    test('should ensure global cccsc directory by default', async () => {
      mockedFs.ensureDir.mockResolvedValue();

      await ensureCccscConfigDir();
      
      expect(mockedFs.ensureDir).toHaveBeenCalledWith('/home/user/.cccsc');
    });
  });
});