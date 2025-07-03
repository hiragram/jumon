/**
 * Utility functions for handling lockfile data structures
 */

/** @typedef {Object} CommandObject
 * @property {string} name - The original command name
 * @property {string} path - The file path
 * @property {string|null} alias - The alias name or null
 */

/** @typedef {string|CommandObject} OnlyItem */

// Constants
const COMMAND_FILE_EXTENSION = '.md';

/**
 * Extracts command name from a file path
 * @param {string} commandPath - The command file path
 * @returns {string} The command name without extension
 * @throws {Error} If the command path is invalid
 */
export function extractCommandName(commandPath) {
  if (!commandPath || typeof commandPath !== 'string') {
    throw new Error('Invalid command path: path must be a non-empty string');
  }
  
  const commandName = commandPath?.split('/').pop()?.replace(COMMAND_FILE_EXTENSION, '') || '';
  
  if (!commandName) {
    throw new Error('Invalid command path: unable to extract command name');
  }
  
  return commandName;
}

/**
 * Normalizes an "only" item to the new object format
 * Handles backward compatibility with legacy string format
 * 
 * @param {OnlyItem} item - The only item (string or object)
 * @returns {CommandObject} Normalized object with {name, path, alias} structure
 */
export function normalizeOnlyItem(item) {
  if (typeof item === 'string') {
    // Legacy format: convert string to object
    return {
      name: item,
      path: `${item}${COMMAND_FILE_EXTENSION}`,
      alias: null
    };
  }
  
  // Already in new format
  return item;
}

/**
 * Finds the index of a command in the "only" array
 * Handles both legacy string format and new object format
 * 
 * @param {OnlyItem[]} onlyArray - Array of only items (strings or objects)
 * @param {string} commandName - Name of the command to find
 * @returns {number} Index of the command, or -1 if not found
 */
export function findCommandIndex(onlyArray, commandName) {
  if (!Array.isArray(onlyArray) || !commandName) {
    return -1;
  }
  
  return onlyArray.findIndex(item => 
    typeof item === 'string' ? item === commandName : item?.name === commandName
  );
}

/**
 * Checks if a command exists in the "only" array
 * Handles both legacy string format and new object format
 * 
 * @param {OnlyItem[]} onlyArray - Array of only items (strings or objects)
 * @param {string} commandName - Name of the command to check
 * @returns {boolean} True if the command exists, false otherwise
 */
export function commandExists(onlyArray, commandName) {
  return findCommandIndex(onlyArray, commandName) !== -1;
}

/**
 * Migrates legacy lockfile data to new format
 * Converts all string entries to object format
 * 
 * @param {Object} lockData - The lockfile data object
 * @returns {Object} Migrated lockfile data with all entries in object format
 */
export function migrateLockfileData(lockData) {
  if (!lockData?.repositories) {
    return lockData;
  }
  
  const migratedData = { ...lockData };
  
  for (const [repoKey, repoData] of Object.entries(migratedData.repositories)) {
    if (repoData?.only && Array.isArray(repoData.only)) {
      migratedData.repositories[repoKey] = {
        ...repoData,
        only: repoData.only.map(normalizeOnlyItem)
      };
    }
  }
  
  return migratedData;
}