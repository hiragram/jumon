import { jest } from '@jest/globals';
import axios from 'axios';
import { 
  parseRepositoryPath, 
  getFileContent, 
  findMarkdownFiles, 
  getLatestCommitHash 
} from '../../src/utils/github.js';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('GitHub Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseRepositoryPath', () => {
    test('should parse user/repo format', () => {
      const result = parseRepositoryPath('user/repo');
      expect(result).toEqual({
        user: 'user',
        repo: 'repo',
        commandPath: null
      });
    });

    test('should parse user/repo/command format', () => {
      const result = parseRepositoryPath('user/repo/command');
      expect(result).toEqual({
        user: 'user',
        repo: 'repo',
        commandPath: 'command'
      });
    });

    test('should parse user/repo/path/to/command format', () => {
      const result = parseRepositoryPath('user/repo/path/to/command');
      expect(result).toEqual({
        user: 'user',
        repo: 'repo',
        commandPath: 'path/to/command'
      });
    });

    test('should throw error for invalid format', () => {
      expect(() => parseRepositoryPath('invalid')).toThrow('Invalid repository path format');
      expect(() => parseRepositoryPath('')).toThrow('Invalid repository path format');
    });
  });

  describe('getFileContent', () => {
    test('should fetch file content successfully', async () => {
      const mockContent = 'file content';
      mockedAxios.get.mockResolvedValue({
        data: {
          content: Buffer.from(mockContent).toString('base64'),
          encoding: 'base64'
        }
      });

      const result = await getFileContent('user', 'repo', 'file.md');
      
      expect(result).toBe(mockContent);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/user/repo/contents/file.md'
      );
    });

    test('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      await expect(getFileContent('user', 'repo', 'nonexistent.md'))
        .rejects.toThrow('API Error');
    });

    test('should handle non-base64 encoding', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          content: 'direct content',
          encoding: 'utf-8'
        }
      });

      const result = await getFileContent('user', 'repo', 'file.md');
      
      expect(result).toBe('direct content');
    });
  });

  describe('findMarkdownFiles', () => {
    test('should find markdown files in repository', async () => {
      const mockResponse = {
        data: [
          { name: 'file1.md', path: 'file1.md', type: 'file' },
          { name: 'file2.txt', path: 'file2.txt', type: 'file' },
          { name: 'subfolder', path: 'subfolder', type: 'dir' }
        ]
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await findMarkdownFiles('user', 'repo');
      
      expect(result).toEqual([
        { name: 'file1', path: 'file1.md' }
      ]);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/user/repo/contents/'
      );
    });

    test('should find markdown files in specific path', async () => {
      const mockResponse = {
        data: [
          { name: 'command.md', path: 'commands/command.md', type: 'file' }
        ]
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await findMarkdownFiles('user', 'repo', 'commands');
      
      expect(result).toEqual([
        { name: 'command', path: 'commands/command.md' }
      ]);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/user/repo/contents/commands'
      );
    });

    test('should handle empty repository', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      const result = await findMarkdownFiles('user', 'repo');
      
      expect(result).toEqual([]);
    });

    test('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Repository not found'));

      await expect(findMarkdownFiles('user', 'nonexistent'))
        .rejects.toThrow('Repository not found');
    });
  });

  describe('getLatestCommitHash', () => {
    test('should get latest commit hash for default branch', async () => {
      const mockResponse = {
        data: {
          sha: 'abc123def456'
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getLatestCommitHash('user', 'repo');
      
      expect(result).toBe('abc123def456');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/user/repo/branches/main'
      );
    });

    test('should get latest commit hash for specific branch', async () => {
      const mockResponse = {
        data: {
          sha: 'def456abc789'
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getLatestCommitHash('user', 'repo', 'develop');
      
      expect(result).toBe('def456abc789');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/user/repo/branches/develop'
      );
    });

    test('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Branch not found'));

      await expect(getLatestCommitHash('user', 'repo', 'nonexistent'))
        .rejects.toThrow('Branch not found');
    });
  });
});