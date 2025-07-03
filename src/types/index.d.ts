/**
 * TypeScript type definitions for cccsc
 */

export interface CccscConfig {
  repositories: Record<string, RepositoryConfig>;
}

export interface RepositoryConfig {
  only: CommandDefinition[];
  branch?: string;
}

export interface CommandDefinition {
  name: string;
  path: string;
  alias: string | null;
}

export interface CccscLock {
  lockfileVersion: number;
  repositories: Record<string, RepositoryLockInfo>;
}

export interface RepositoryLockInfo {
  revision: string;
  only: CommandDefinition[];
}

export interface CommandOptions {
  global?: boolean;
  skipLockFileSave?: boolean;
}

export interface AddOptions extends CommandOptions {
  alias?: string;
  branch?: string;
}

export interface InstallOptions extends CommandOptions {
  // Additional install-specific options can be added here
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: 'file' | 'dir';
}

export interface ParsedRepository {
  user: string;
  repo: string;
}

export interface CommandContext {
  isLocal: boolean;
  operation: string;
  [key: string]: any;
}

export interface ErrorContext {
  type: string;
  message: string;
  context: string;
  metadata: Record<string, any>;
  timestamp: string;
  stack?: string;
}

export type ErrorType = 
  | 'CONFIG_READ_ERROR'
  | 'CONFIG_WRITE_ERROR'
  | 'CONFIG_PARSE_ERROR'
  | 'CONFIG_VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'GITHUB_API_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'FILE_NOT_FOUND'
  | 'FILE_READ_ERROR'
  | 'FILE_WRITE_ERROR'
  | 'FILE_COPY_ERROR'
  | 'FILE_REMOVE_ERROR'
  | 'FILE_STAT_ERROR'
  | 'DIRECTORY_CREATE_ERROR'
  | 'DIRECTORY_READ_ERROR'
  | 'PERMISSION_ERROR'
  | 'DISK_SPACE_ERROR'
  | 'INVALID_COMMAND_PATH'
  | 'COMMAND_NOT_FOUND'
  | 'REPOSITORY_NOT_FOUND'
  | 'DEPENDENCY_ERROR'
  | 'GENERAL_ERROR'
  | 'UNKNOWN_ERROR'
  | 'VALIDATION_ERROR';

export declare class CommandError extends Error {
  readonly type: ErrorType;
  readonly context: Record<string, any>;
  readonly cause: Error | null;
  readonly timestamp: string;
  
  constructor(message: string, type?: ErrorType, context?: Record<string, any>, cause?: Error | null);
  
  static fromError(error: Error, type?: ErrorType, context?: Record<string, any>): CommandError;
  static configError(message: string, context?: Record<string, any>): CommandError;
  static fileError(message: string, context?: Record<string, any>): CommandError;
  static networkError(message: string, context?: Record<string, any>): CommandError;
  static validationError(message: string, context?: Record<string, any>): CommandError;
  static permissionError(message: string, context?: Record<string, any>): CommandError;
  
  getFormattedMessage(): string;
  getRecoverySuggestions(): string[];
  toJSON(): ErrorContext;
}

export declare function handleCommandError(error: Error | CommandError, operation?: string): never;