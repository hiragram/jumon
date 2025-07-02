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

export async function addRepositoryToLock(user, repo, revision, isLocal = false) {
  const lock = await loadJumonLock(isLocal);
  
  if (!lock.repositories) {
    lock.repositories = {};
  }
  
  const repoKey = `${user}/${repo}`;
  lock.repositories[repoKey] = {
    revision: revision
  };
  
  await saveJumonLock(lock, isLocal);
}

export async function getRepositoryFromLock(user, repo, isLocal = false) {
  const lock = await loadJumonLock(isLocal);
  const repoKey = `${user}/${repo}`;
  return lock.repositories?.[repoKey] || null;
}