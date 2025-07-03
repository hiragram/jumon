/**
 * Filesystem utilities to reduce code duplication
 * Provides consistent file operations with proper error handling
 */

import fs from 'fs-extra';
import path from 'path';
import { CommandError } from './command-error.js';
import { ErrorTypes } from './error-types.js';

/**
 * Safely read a JSON file with error handling
 */
export async function readJsonFile(filePath, defaultValue = null) {
  try {
    if (await fs.pathExists(filePath)) {
      const content = await fs.readJson(filePath);
      return content;
    }
    return defaultValue;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw CommandError.fileError(`File not found: ${filePath}`, { filePath });
    } else if (error.code === 'EACCES') {
      throw CommandError.permissionError(`Permission denied: ${filePath}`, { filePath });
    } else if (error.name === 'SyntaxError' || error.message.includes('JSON')) {
      throw CommandError.configError(`Invalid JSON in file: ${filePath}`, { filePath });
    } else {
      throw CommandError.fromError(error, ErrorTypes.FILE_READ_ERROR, { filePath });
    }
  }
}

/**
 * Safely write a JSON file with error handling
 */
export async function writeJsonFile(filePath, data, options = { spaces: 2 }) {
  try {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeJson(filePath, data, options);
  } catch (error) {
    if (error.code === 'EACCES') {
      throw CommandError.permissionError(`Permission denied writing to: ${filePath}`, { filePath });
    } else if (error.code === 'ENOSPC') {
      throw CommandError.fromError(error, ErrorTypes.DISK_SPACE_ERROR, { filePath });
    } else {
      throw CommandError.fromError(error, ErrorTypes.FILE_WRITE_ERROR, { filePath });
    }
  }
}

/**
 * Safely read a text file with error handling
 */
export async function readTextFile(filePath) {
  try {
    if (await fs.pathExists(filePath)) {
      return await fs.readFile(filePath, 'utf8');
    }
    throw CommandError.fileError(`File not found: ${filePath}`, { filePath });
  } catch (error) {
    if (error instanceof CommandError) {
      throw error;
    }
    
    if (error.code === 'ENOENT') {
      throw CommandError.fileError(`File not found: ${filePath}`, { filePath });
    } else if (error.code === 'EACCES') {
      throw CommandError.permissionError(`Permission denied: ${filePath}`, { filePath });
    } else {
      throw CommandError.fromError(error, ErrorTypes.FILE_READ_ERROR, { filePath });
    }
  }
}

/**
 * Safely write a text file with error handling
 */
export async function writeTextFile(filePath, content) {
  try {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content);
  } catch (error) {
    if (error.code === 'EACCES') {
      throw CommandError.permissionError(`Permission denied writing to: ${filePath}`, { filePath });
    } else if (error.code === 'ENOSPC') {
      throw CommandError.fromError(error, ErrorTypes.DISK_SPACE_ERROR, { filePath });
    } else {
      throw CommandError.fromError(error, ErrorTypes.FILE_WRITE_ERROR, { filePath });
    }
  }
}

/**
 * Safely ensure a directory exists with error handling
 */
export async function ensureDirectory(dirPath) {
  try {
    await fs.ensureDir(dirPath);
  } catch (error) {
    if (error.code === 'EACCES') {
      throw CommandError.permissionError(`Permission denied creating directory: ${dirPath}`, { dirPath });
    } else if (error.code === 'ENOSPC') {
      throw CommandError.fromError(error, ErrorTypes.DISK_SPACE_ERROR, { dirPath });
    } else {
      throw CommandError.fromError(error, ErrorTypes.DIRECTORY_CREATE_ERROR, { dirPath });
    }
  }
}

/**
 * Safely check if a path exists
 */
export async function pathExists(filePath) {
  try {
    return await fs.pathExists(filePath);
  } catch (error) {
    // pathExists should not throw, but let's be safe
    return false;
  }
}

/**
 * Safely get file statistics
 */
export async function getFileStats(filePath) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw CommandError.fileError(`File not found: ${filePath}`, { filePath });
    } else if (error.code === 'EACCES') {
      throw CommandError.permissionError(`Permission denied: ${filePath}`, { filePath });
    } else {
      throw CommandError.fromError(error, ErrorTypes.FILE_STAT_ERROR, { filePath });
    }
  }
}

/**
 * Safely copy a file with error handling
 */
export async function copyFile(srcPath, destPath) {
  try {
    await fs.ensureDir(path.dirname(destPath));
    await fs.copy(srcPath, destPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw CommandError.fileError(`Source file not found: ${srcPath}`, { srcPath, destPath });
    } else if (error.code === 'EACCES') {
      throw CommandError.permissionError(`Permission denied copying file`, { srcPath, destPath });
    } else if (error.code === 'ENOSPC') {
      throw CommandError.fromError(error, ErrorTypes.DISK_SPACE_ERROR, { srcPath, destPath });
    } else {
      throw CommandError.fromError(error, ErrorTypes.FILE_COPY_ERROR, { srcPath, destPath });
    }
  }
}

/**
 * Safely remove a file or directory with error handling
 */
export async function removeFile(filePath) {
  try {
    await fs.remove(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, that's fine
      return;
    } else if (error.code === 'EACCES') {
      throw CommandError.permissionError(`Permission denied removing: ${filePath}`, { filePath });
    } else {
      throw CommandError.fromError(error, ErrorTypes.FILE_REMOVE_ERROR, { filePath });
    }
  }
}

/**
 * Safely list directory contents with error handling
 */
export async function listDirectory(dirPath) {
  try {
    return await fs.readdir(dirPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw CommandError.fileError(`Directory not found: ${dirPath}`, { dirPath });
    } else if (error.code === 'EACCES') {
      throw CommandError.permissionError(`Permission denied accessing: ${dirPath}`, { dirPath });
    } else if (error.code === 'ENOTDIR') {
      throw CommandError.validationError(`Not a directory: ${dirPath}`, { dirPath });
    } else {
      throw CommandError.fromError(error, ErrorTypes.DIRECTORY_READ_ERROR, { dirPath });
    }
  }
}

/**
 * Get file extension safely
 */
export function getFileExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}

/**
 * Get file name without extension
 */
export function getFileNameWithoutExtension(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Join paths safely
 */
export function joinPaths(...paths) {
  return path.join(...paths);
}

/**
 * Get directory name
 */
export function getDirectoryName(filePath) {
  return path.dirname(filePath);
}

/**
 * Normalize path separators
 */
export function normalizePath(filePath) {
  return path.normalize(filePath);
}