import { getCccscConfigPath, getCccscLockPath, ensureCccscConfigDir } from './paths.js';
import { findCommandIndex, extractCommandName, migrateLockfileData } from './lock-helpers.js';
import { readJsonFile, writeJsonFile } from './filesystem.js';

// Current lockfile version for npm compatibility
const CURRENT_LOCKFILE_VERSION = 3;

export async function loadCccscConfig(isLocal = false) {
  const configPath = getCccscConfigPath(isLocal);
  
  const config = await readJsonFile(configPath, {
    repositories: {}
  });
  
  return config;
}

export async function saveCccscConfig(config, isLocal = false) {
  await ensureCccscConfigDir(isLocal);
  const configPath = getCccscConfigPath(isLocal);
  await writeJsonFile(configPath, config, { spaces: 2 });
}

export async function loadCccscLock(isLocal = false) {
  const lockPath = getCccscLockPath(isLocal);
  
  const lockData = await readJsonFile(lockPath, {
    lockfileVersion: CURRENT_LOCKFILE_VERSION,
    repositories: {}
  });
  
  // Automatically migrate legacy data to new format
  return migrateLockfileData(lockData);
}

export async function saveCccscLock(lock, isLocal = false) {
  await ensureCccscConfigDir(isLocal);
  const lockPath = getCccscLockPath(isLocal);
  await writeJsonFile(lockPath, lock, { spaces: 2 });
}

export async function addRepositoryToConfig(user, repo, commandPath = null, alias = null, branch = null, isLocal = false) {
  const config = await loadCccscConfig(isLocal);
  
  if (!config.repositories) {
    config.repositories = {};
  }
  
  const repoKey = `${user}/${repo}`;
  
  if (!config.repositories[repoKey]) {
    config.repositories[repoKey] = {
      only: []
    };
  }
  
  // Add branch constraint (only if provided)
  if (branch) {
    config.repositories[repoKey].branch = branch;
  }
  
  if (commandPath) {
    // Add specific command
    const originalName = extractCommandName(commandPath);
    const existingCommand = config.repositories[repoKey].only.find(cmd => cmd.path === commandPath);
    
    if (!existingCommand) {
      config.repositories[repoKey].only.push({
        name: originalName,
        path: commandPath,
        alias: alias || null
      });
    } else if (alias !== existingCommand.alias) {
      // Update alias if provided or changed
      existingCommand.alias = alias || null;
    }
  } else {
    // Repository-wide installation (empty only array means all commands)
    config.repositories[repoKey].only = [];
  }
  
  await saveCccscConfig(config, isLocal);
}


export async function addRepositoryToLock(user, repo, revision, commandPath = null, alias = null, isLocal = false) {
  const lock = await loadCccscLock(isLocal);
  
  if (!lock.repositories) {
    lock.repositories = {};
  }
  
  const repoKey = `${user}/${repo}`;
  const existingRepo = lock.repositories[repoKey];
  
  // Create or update repository entry
  const repoEntry = {
    revision: revision,
    only: []
  };
  
  // If there's an existing entry, preserve existing "only" commands
  if (existingRepo && existingRepo.only) {
    repoEntry.only = [...existingRepo.only];
  }
  
  // Add new command to "only" list if specified
  if (commandPath) {
    const commandName = extractCommandName(commandPath);
    // Handle backward compatibility: legacy lockfiles may contain string arrays
    // while new lockfiles contain object arrays with {name, path, alias} structure
    const existingCommandIndex = findCommandIndex(repoEntry.only, commandName);
    
    if (existingCommandIndex !== -1) {
      // Update existing command with new alias
      repoEntry.only[existingCommandIndex] = {
        name: commandName,
        path: commandPath,
        alias: alias
      };
    } else {
      // Add new command
      repoEntry.only.push({
        name: commandName,
        path: commandPath,
        alias: alias
      });
    }
  } else if (!existingRepo || !existingRepo.only || existingRepo.only.length === 0) {
    // If no specific command and no existing "only" list, keep empty (all commands)
    repoEntry.only = [];
  }
  
  lock.repositories[repoKey] = repoEntry;
  await saveCccscLock(lock, isLocal);
}

export async function getRepositoryFromLock(user, repo, isLocal = false) {
  const lock = await loadCccscLock(isLocal);
  const repoKey = `${user}/${repo}`;
  return lock.repositories?.[repoKey] || null;
}