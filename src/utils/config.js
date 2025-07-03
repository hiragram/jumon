import fs from 'fs-extra';
import { getCccscConfigPath, getCccscLockPath, ensureCccscConfigDir } from './paths.js';
import { parseRepositoryPath } from './github.js';

// Current lockfile version for npm compatibility
const CURRENT_LOCKFILE_VERSION = 3;

export async function loadCccscConfig(isLocal = false) {
  const configPath = getCccscConfigPath(isLocal);
  
  try {
    if (await fs.pathExists(configPath)) {
      return await fs.readJson(configPath);
    }
  } catch (error) {
    console.warn(`Failed to load cccsc.json: ${error.message}`);
  }
  
  return {
    repositories: {}
  };
}

export async function saveCccscConfig(config, isLocal = false) {
  await ensureCccscConfigDir(isLocal);
  const configPath = getCccscConfigPath(isLocal);
  await fs.writeJson(configPath, config, { spaces: 2 });
}

export async function loadCccscLock(isLocal = false) {
  const lockPath = getCccscLockPath(isLocal);
  
  try {
    if (await fs.pathExists(lockPath)) {
      return await fs.readJson(lockPath);
    }
  } catch (error) {
    console.warn(`Failed to load cccsc-lock.json: ${error.message}`);
  }
  
  return {
    lockfileVersion: CURRENT_LOCKFILE_VERSION,
    repositories: {}
  };
}

export async function saveCccscLock(lock, isLocal = false) {
  await ensureCccscConfigDir(isLocal);
  const lockPath = getCccscLockPath(isLocal);
  await fs.writeJson(lockPath, lock, { spaces: 2 });
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
    const originalName = commandPath.split('/').pop().replace('.md', '');
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
    const commandName = commandPath.split('/').pop().replace('.md', '');
    const existingCommandIndex = repoEntry.only.findIndex(item => 
      typeof item === 'string' ? item === commandName : item.name === commandName
    );
    
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