/**
 * Utility functions for handling lockfile data structures
 */

/**
 * Normalizes an "only" item to the new object format
 * Handles backward compatibility with legacy string format
 * 
 * @param {string|object} item - The only item (string or object)
 * @returns {object} Normalized object with {name, path, alias} structure
 */
export function normalizeOnlyItem(item) {
  if (typeof item === 'string') {
    // Legacy format: convert string to object
    return {
      name: item,
      path: `${item}.md`,
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
 * @param {Array} onlyArray - Array of only items (strings or objects)
 * @param {string} commandName - Name of the command to find
 * @returns {number} Index of the command, or -1 if not found
 */
export function findCommandIndex(onlyArray, commandName) {
  return onlyArray.findIndex(item => 
    typeof item === 'string' ? item === commandName : item.name === commandName
  );
}

/**
 * Checks if a command exists in the "only" array
 * Handles both legacy string format and new object format
 * 
 * @param {Array} onlyArray - Array of only items (strings or objects)
 * @param {string} commandName - Name of the command to check
 * @returns {boolean} True if the command exists, false otherwise
 */
export function commandExists(onlyArray, commandName) {
  return findCommandIndex(onlyArray, commandName) !== -1;
}