/**
 * Repository utilities for parsing and validating repository configurations
 */

/**
 * Parses a repository key into user and repo components
 * @param {string} repoKey - Repository key in format "user/repo"
 * @returns {{user: string, repo: string}} Parsed repository components
 * @throws {Error} If repoKey format is invalid
 */
export function parseRepositoryKey(repoKey) {
  if (typeof repoKey !== 'string') {
    throw new Error('Repository key must be a string');
  }
  
  const parts = repoKey.split('/');
  
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid repository key format: ${repoKey}. Expected format: user/repo`);
  }
  
  return {
    user: parts[0],
    repo: parts[1]
  };
}

/**
 * Validates repository configuration object
 * @param {any} repoConfig - Repository configuration to validate
 * @returns {boolean} True if configuration is valid
 */
export function validateRepositoryConfig(repoConfig) {
  if (!repoConfig || typeof repoConfig !== 'object') {
    return false;
  }
  
  // Check for valid branch name if specified
  if (repoConfig.branch && typeof repoConfig.branch !== 'string') {
    return false;
  }
  
  // Check for valid version if specified
  if (repoConfig.version !== undefined && (repoConfig.version === null || typeof repoConfig.version !== 'string')) {
    return false;
  }
  
  // Check for valid tag if specified
  if (repoConfig.tag !== undefined && (repoConfig.tag === null || typeof repoConfig.tag !== 'string')) {
    return false;
  }
  
  // Check for valid only array if specified
  if (repoConfig.only && !Array.isArray(repoConfig.only)) {
    return false;
  }
  
  return true;
}

/**
 * Creates a standardized repository configuration with defaults
 * @param {any} repoConfig - Input repository configuration
 * @returns {object} Normalized repository configuration
 */
export function normalizeRepositoryConfig(repoConfig) {
  if (!validateRepositoryConfig(repoConfig)) {
    throw new Error('Invalid repository configuration');
  }
  
  return {
    branch: repoConfig.branch || 'main',
    version: repoConfig.version || null,
    tag: repoConfig.tag || null,
    only: repoConfig.only || []
  };
}