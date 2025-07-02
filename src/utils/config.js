import fs from 'fs-extra';
import { getJumonConfigPath, getJumonLockPath } from './paths.js';

export async function loadJumonConfig(isLocal = false) {
  const configPath = getJumonConfigPath(isLocal);
  
  try {
    if (await fs.pathExists(configPath)) {
      const content = await fs.readJson(configPath);
      return content;
    }
  } catch (error) {
    console.warn(`Failed to load jumon.json: ${error.message}`);
  }
  
  return {
    name: isLocal ? 'local-commands' : 'global-commands',
    version: '1.0.0',
    commands: {}
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
      return content;
    }
  } catch (error) {
    console.warn(`Failed to load jumon-lock.json: ${error.message}`);
  }
  
  return {
    lockfileVersion: 1,
    commands: {}
  };
}

export async function saveJumonLock(lock, isLocal = false) {
  const lockPath = getJumonLockPath(isLocal);
  await fs.writeJson(lockPath, lock, { spaces: 2 });
}

export async function addCommandToConfig(repoPath, alias, isLocal = false) {
  const config = await loadJumonConfig(isLocal);
  
  if (!config.commands) {
    config.commands = {};
  }
  
  if (alias) {
    config.commands[repoPath] = { alias };
  } else {
    config.commands[repoPath] = {};
  }
  
  await saveJumonConfig(config, isLocal);
}

export async function addCommandToLock(repoPath, commandName, user, repo, filePath, isLocal = false) {
  const lock = await loadJumonLock(isLocal);
  
  if (!lock.commands) {
    lock.commands = {};
  }
  
  lock.commands[commandName] = {
    repository: `${user}/${repo}`,
    path: filePath,
    source: repoPath
  };
  
  await saveJumonLock(lock, isLocal);
}