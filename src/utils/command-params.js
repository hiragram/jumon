/**
 * Standardized command parameter interfaces
 */

/**
 * @typedef {Object} CommandAddParams
 * @property {string} user - GitHub username
 * @property {string} repo - Repository name
 * @property {string|null} commandPath - Path to specific command file
 * @property {string|null} alias - Command alias
 * @property {string|null} branch - Repository branch
 * @property {boolean} isLocal - Whether to use local config
 */

/**
 * @typedef {Object} CommandLockParams
 * @property {string} user - GitHub username
 * @property {string} repo - Repository name
 * @property {string} revision - Git revision/commit hash
 * @property {string|null} commandPath - Path to specific command file
 * @property {string|null} alias - Command alias
 * @property {boolean} isLocal - Whether to use local config
 */

/**
 * Creates standardized parameters for repository config operations
 * 
 * @param {string} user - GitHub username
 * @param {string} repo - Repository name
 * @param {string|null} commandPath - Path to specific command file
 * @param {string|null} alias - Command alias
 * @param {string|null} branch - Repository branch
 * @param {boolean} isLocal - Whether to use local config
 * @returns {CommandAddParams} Standardized parameters
 */
export function createAddParams(user, repo, commandPath = null, alias = null, branch = null, isLocal = false) {
  return {
    user: String(user),
    repo: String(repo),
    commandPath: commandPath ? String(commandPath) : null,
    alias: alias ? String(alias) : null,
    branch: branch ? String(branch) : null,
    isLocal: Boolean(isLocal)
  };
}

/**
 * Creates standardized parameters for repository lock operations
 * 
 * @param {string} user - GitHub username
 * @param {string} repo - Repository name
 * @param {string} revision - Git revision/commit hash
 * @param {string|null} commandPath - Path to specific command file
 * @param {string|null} alias - Command alias
 * @param {boolean} isLocal - Whether to use local config
 * @returns {CommandLockParams} Standardized parameters
 */
export function createLockParams(user, repo, revision, commandPath = null, alias = null, isLocal = false) {
  return {
    user: String(user),
    repo: String(repo),
    revision: String(revision),
    commandPath: commandPath ? String(commandPath) : null,
    alias: alias ? String(alias) : null,
    isLocal: Boolean(isLocal)
  };
}

/**
 * Validates command parameters
 * 
 * @param {CommandAddParams|CommandLockParams} params - Parameters to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function validateCommandParams(params) {
  if (!params || typeof params !== 'object') {
    return false;
  }
  
  const { user, repo } = params;
  
  if (!user || !repo || typeof user !== 'string' || typeof repo !== 'string') {
    return false;
  }
  
  // Additional validation for lock params
  if ('revision' in params) {
    if (!params.revision || typeof params.revision !== 'string') {
      return false;
    }
  }
  
  return true;
}