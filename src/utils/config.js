import fs from 'fs-extra';
import { getJumonConfigPath, getJumonLockPath, ensureJumonConfigDir } from './paths.js';
import { parseRepositoryPath } from './github.js';

export async function loadJumonConfig(isLocal = false) {
  const configPath = getJumonConfigPath(isLocal);
  
  try {
    if (await fs.pathExists(configPath)) {
      return await fs.readJson(configPath);
    }
  } catch (error) {
    console.warn(`Failed to load jumon.json: ${error.message}`);
  }
  
  return {
    repositories: {}
  };
}

export async function saveJumonConfig(config, isLocal = false) {
  await ensureJumonConfigDir(isLocal);
  const configPath = getJumonConfigPath(isLocal);
  await fs.writeJson(configPath, config, { spaces: 2 });
}

export async function loadJumonLock(isLocal = false) {
  const lockPath = getJumonLockPath(isLocal);
  
  try {
    if (await fs.pathExists(lockPath)) {
      return await fs.readJson(lockPath);
    }
  } catch (error) {
    console.warn(`Failed to load jumon-lock.json: ${error.message}`);
  }
  
  return {
    lockfileVersion: 1,
    repositories: {}
  };
}

export async function saveJumonLock(lock, isLocal = false) {
  await ensureJumonConfigDir(isLocal);
  const lockPath = getJumonLockPath(isLocal);
  await fs.writeJson(lockPath, lock, { spaces: 2 });
}

export async function addRepositoryToConfig(user, repo, commandPath = null, alias = null, version = null, branch = null, tag = null, isLocal = false) {
  const config = await loadJumonConfig(isLocal);
  
  if (!config.repositories) {
    config.repositories = {};
  }
  
  const repoKey = `${user}/${repo}`;
  
  if (!config.repositories[repoKey]) {
    config.repositories[repoKey] = {
      only: []
    };
  }
  
  // Add version/branch/tag constraints (only if provided)
  if (version) {
    config.repositories[repoKey].version = version;
    // Remove branch/tag if version is specified
    delete config.repositories[repoKey].branch;
    delete config.repositories[repoKey].tag;
  } else if (tag) {
    config.repositories[repoKey].tag = tag;
    // Remove branch/version if tag is specified
    delete config.repositories[repoKey].branch;
    delete config.repositories[repoKey].version;
  } else if (branch) {
    config.repositories[repoKey].branch = branch;
    // Remove version/tag if branch is specified
    delete config.repositories[repoKey].version;
    delete config.repositories[repoKey].tag;
  }
  
  if (commandPath) {
    // Add specific command
    const commandName = alias || commandPath.split('/').pop().replace('.md', '');
    const existingCommand = config.repositories[repoKey].only.find(cmd => cmd.path === commandPath);
    
    if (!existingCommand) {
      config.repositories[repoKey].only.push({
        name: commandName,
        path: commandPath,
        alias: alias || null
      });
    } else if (alias && existingCommand.alias !== alias) {
      // Update alias if provided
      existingCommand.alias = alias;
      existingCommand.name = alias;
    }
  } else {
    // Repository-wide installation (empty only array means all commands)
    config.repositories[repoKey].only = [];
  }
  
  await saveJumonConfig(config, isLocal);
}


export async function addRepositoryToLock(user, repo, revision, commandPath = null, isLocal = false) {
  const lock = await loadJumonLock(isLocal);
  
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
    if (!repoEntry.only.includes(commandName)) {
      repoEntry.only.push(commandName);
    }
  } else if (!existingRepo || !existingRepo.only || existingRepo.only.length === 0) {
    // If no specific command and no existing "only" list, keep empty (all commands)
    repoEntry.only = [];
  }
  
  lock.repositories[repoKey] = repoEntry;
  await saveJumonLock(lock, isLocal);
}

export async function getRepositoryFromLock(user, repo, isLocal = false) {
  const lock = await loadJumonLock(isLocal);
  const repoKey = `${user}/${repo}`;
  return lock.repositories?.[repoKey] || null;
}