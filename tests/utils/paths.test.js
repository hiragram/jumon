import { jest } from '@jest/globals';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import {
  getGlobalCommandsPath,
  getLocalCommandsPath,
  getCommandsPath,
  getJumonConfigPath,
  getJumonLockPath,
  checkClaudeDir,
  ensureCommandsDir,
  ensureJumonConfigDir
} from '../../src/utils/paths.js';

// Mock fs-extra, os, and path
jest.mock('fs-extra');
jest.mock('os');
jest.mock('path');

const mockedFs = fs;
const mockedOs = os;
const mockedPath = path;

describe('Paths Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockedOs.homedir.mockReturnValue('/home/user');
    mockedPath.join.mockImplementation((...args) => args.join('/'));
    process.cwd = jest.fn().mockReturnValue('/current/dir');
  });

  describe('getGlobalCommandsPath', () => {
    test('should return global commands path', () => {
      const result = getGlobalCommandsPath();
      
      expect(result).toBe('/home/user/.claude/commands/jumon');
      expect(mockedOs.homedir).toHaveBeenCalled();
      expect(mockedPath.join).toHaveBeenCalledWith('/home/user', '.claude', 'commands', 'jumon');
    });
  });

  describe('getLocalCommandsPath', () => {
    test('should return local commands path', () => {
      const result = getLocalCommandsPath();
      
      expect(result).toBe('/current/dir/.claude/commands/jumon');
      expect(mockedPath.join).toHaveBeenCalledWith('/current/dir', '.claude', 'commands', 'jumon');
    });
  });

  describe('getCommandsPath', () => {
    test('should return local path when isLocal is true', () => {
      const result = getCommandsPath(true);
      
      expect(result).toBe('/current/dir/.claude/commands/jumon');
    });

    test('should return global path when isLocal is false', () => {
      const result = getCommandsPath(false);
      
      expect(result).toBe('/home/user/.claude/commands/jumon');
    });

    test('should return global path by default', () => {
      const result = getCommandsPath();
      
      expect(result).toBe('/home/user/.claude/commands/jumon');
    });
  });

  describe('getJumonConfigPath', () => {
    test('should return local config path when isLocal is true', () => {
      const result = getJumonConfigPath(true);
      
      expect(result).toBe('/current/dir/jumon.json');
      expect(mockedPath.join).toHaveBeenCalledWith('/current/dir', 'jumon.json');
    });

    test('should return global config path when isLocal is false', () => {
      const result = getJumonConfigPath(false);
      
      expect(result).toBe('/home/user/.jumon/jumon.json');
      expect(mockedPath.join).toHaveBeenCalledWith('/home/user', '.jumon', 'jumon.json');
    });

    test('should return global config path by default', () => {
      const result = getJumonConfigPath();
      
      expect(result).toBe('/home/user/.jumon/jumon.json');
    });
  });

  describe('getJumonLockPath', () => {
    test('should return local lock path when isLocal is true', () => {
      const result = getJumonLockPath(true);
      
      expect(result).toBe('/current/dir/jumon-lock.json');
      expect(mockedPath.join).toHaveBeenCalledWith('/current/dir', 'jumon-lock.json');
    });

    test('should return global lock path when isLocal is false', () => {
      const result = getJumonLockPath(false);
      
      expect(result).toBe('/home/user/.jumon/jumon-lock.json');
      expect(mockedPath.join).toHaveBeenCalledWith('/home/user', '.jumon', 'jumon-lock.json');
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
      
      expect(result).toBe('/current/dir/.claude/commands/jumon');
      expect(mockedFs.pathExists).toHaveBeenCalledWith('/current/dir/.claude');
      expect(mockedFs.ensureDir).toHaveBeenCalledWith('/current/dir/.claude/commands/jumon');
    });

    test('should ensure global commands directory exists', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.ensureDir.mockResolvedValue();

      const result = await ensureCommandsDir(false);
      
      expect(result).toBe('/home/user/.claude/commands/jumon');
      expect(mockedFs.pathExists).toHaveBeenCalledWith('/home/user/.claude');
      expect(mockedFs.ensureDir).toHaveBeenCalledWith('/home/user/.claude/commands/jumon');
    });

    test('should throw error if Claude directory check fails', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      await expect(ensureCommandsDir(true))
        .rejects.toThrow('Claude Code directory not found in current directory. Please ensure .claude directory exists.');
    });
  });

  describe('ensureJumonConfigDir', () => {
    test('should not create directory for local config', async () => {
      await ensureJumonConfigDir(true);
      
      expect(mockedFs.ensureDir).not.toHaveBeenCalled();
    });

    test('should ensure global jumon directory exists', async () => {
      mockedFs.ensureDir.mockResolvedValue();

      await ensureJumonConfigDir(false);
      
      expect(mockedFs.ensureDir).toHaveBeenCalledWith('/home/user/.jumon');
    });

    test('should ensure global jumon directory by default', async () => {
      mockedFs.ensureDir.mockResolvedValue();

      await ensureJumonConfigDir();
      
      expect(mockedFs.ensureDir).toHaveBeenCalledWith('/home/user/.jumon');
    });
  });
});