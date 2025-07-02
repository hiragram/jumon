import fs from 'fs-extra';
import { getJumonConfigPath, getJumonLockPath } from './paths.js';
import { parseRepositoryPath } from './github.js';

export async function loadJumonConfig(isLocal = false) {
  const configPath = getJumonConfigPath(isLocal);
  
  try {
    if (await fs.pathExists(configPath)) {
      const content = await fs.readJson(configPath);
      
      // Migration: convert old structure to new structure
      if (content.commands && !content.repositories) {
        const newConfig = {
          repositories: {}
        };
        
        // Convert old commands structure to new repositories structure
        for (const [repoPath, commandConfig] of Object.entries(content.commands)) {
          try {
            const { user, repo, commandPath } = parseRepositoryPath(repoPath);
            const repoKey = `${user}/${repo}`;
            
            if (!newConfig.repositories[repoKey]) {
              newConfig.repositories[repoKey] = {
                only: []
              };
            }
            
            if (commandPath) {
              const commandName = commandConfig.alias || commandPath.split('/').pop().replace('.md', '');
              newConfig.repositories[repoKey].only.push({
                name: commandName,
                path: commandPath,
                alias: commandConfig.alias || null
              });
            } else {
              // Repository-wide installation
              newConfig.repositories[repoKey].only = [];
            }
          } catch (error) {
            console.warn(`Failed to migrate command entry: ${repoPath}`);
          }
        }
        
        return newConfig;
      }
      
      // Migration: rename commands to only in existing repositories structure
      if (content.repositories) {
        for (const [repoKey, repoConfig] of Object.entries(content.repositories)) {
          if (repoConfig.commands !== undefined && repoConfig.only === undefined) {
            repoConfig.only = repoConfig.commands;
            delete repoConfig.commands;
          }
        }
      }
      
      return content;
    }
  } catch (error) {
    console.warn(`Failed to load jumon.json: ${error.message}`);
  }
  
  return {
    repositories: {}
  };
}

export async function saveJumonConfig(config, isLocal = false) {
  const configPath = getJumonConfigPath(isLocal);
  await fs.writeJson(configPath, config, { spaces: 2 });
}

export async function loadJumonLock(isLocal = false) {
  const lockPath = getJumonLockPath(isLocal);
  
  try {
    if (await fs.pathExists(lockPath)) {
      const content = await fs.readJson(lockPath);
      // Migration: convert old structure to new structure
      if (content.commands && !content.repositories) {
        return {
          lockfileVersion: 2,
          repositories: {}
        };
      }
      return content;
    }
  } catch (error) {
    console.warn(`Failed to load jumon-lock.json: ${error.message}`);
  }
  
  return {
    lockfileVersion: 2,
    repositories: {}
  };
}

export async function saveJumonLock(lock, isLocal = false) {
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
  
  // Add version/branch/tag constraints
  if (version) {
    config.repositories[repoKey].version = version;
  }
  if (branch) {
    config.repositories[repoKey].branch = branch;
  }
  if (tag) {
    config.repositories[repoKey].tag = tag;
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

// Legacy function for backward compatibility
export async function addCommandToConfig(repoPath, alias, isLocal = false) {
  try {
    const { user, repo, commandPath } = parseRepositoryPath(repoPath);
    await addRepositoryToConfig(user, repo, commandPath, alias, isLocal);
  } catch (error) {
    console.warn(`Failed to add command to config: ${error.message}`);
  }
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