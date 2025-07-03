import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';
import { getLatestCommitHash } from '../utils/github.js';
import { ensureCommandsDir } from '../utils/paths.js';
import { loadJumonConfig, loadJumonLock, saveJumonLock } from '../utils/config.js';
import { installCommand } from './install.js';

async function resolveRepositoryRevision(user, repo, repoConfig) {
  const branch = repoConfig.branch || 'main';
  
  if (repoConfig.version) {
    // For now, treat version as a tag. In the future, this could resolve version ranges
    const tagName = repoConfig.version.replace(/^[~^>=<\s]+/, ''); // Strip version operators
    try {
      // Try to get commit hash for the tag
      const response = await axios.get(`https://api.github.com/repos/${user}/${repo}/git/refs/tags/${tagName}`);
      return response.data.object.sha;
    } catch (error) {
      console.warn(`Failed to resolve version ${repoConfig.version} for ${user}/${repo}, falling back to latest commit`);
    }
    // Fallback to latest commit on specified branch
    return await getLatestCommitHash(user, repo, branch);
  } else if (repoConfig.tag) {
    // Get commit hash for specific tag
    try {
      const response = await axios.get(`https://api.github.com/repos/${user}/${repo}/git/refs/tags/${repoConfig.tag}`);
      return response.data.object.sha;
    } catch (error) {
      console.warn(`Failed to resolve tag ${repoConfig.tag} for ${user}/${repo}, falling back to latest commit`);
    }
    // Fallback to latest commit on specified branch
    return await getLatestCommitHash(user, repo, branch);
  } else {
    // Use specific branch or default to main
    return await getLatestCommitHash(user, repo, branch);
  }
}

async function updateLockFile(config, isLocal) {
  const lock = await loadJumonLock(isLocal);
  
  if (!lock.repositories) {
    lock.repositories = {};
  }
  
  for (const [repoKey, repoConfig] of Object.entries(config.repositories)) {
    try {
      const [user, repo] = repoKey.split('/');
      const newRevision = await resolveRepositoryRevision(user, repo, repoConfig);
      
      const currentRevision = lock.repositories[repoKey]?.revision;
      
      if (currentRevision !== newRevision) {
        console.log(`Updating ${repoKey}: ${currentRevision?.substring(0, 7) || 'unknown'} → ${newRevision.substring(0, 7)}`);
        
        // Update lock file with new revision, only list will be updated by install
        lock.repositories[repoKey] = {
          revision: newRevision,
          only: [] // Will be populated by install command
        };
      } else {
        console.log(`${repoKey} is already up to date`);
      }
    } catch (error) {
      console.error(`✗ Failed to update ${repoKey}: ${error.message}`);
    }
  }
  
  await saveJumonLock(lock, isLocal);
  return lock;
}

async function clearCommandsDirectory(config, isLocal) {
  const commandsDir = await ensureCommandsDir(isLocal);
  
  // Clear each repository's commands
  for (const repoKey of Object.keys(config.repositories)) {
    const [user, repo] = repoKey.split('/');
    const repoDir = path.join(commandsDir, user, repo);
    
    if (await fs.pathExists(repoDir)) {
      await fs.remove(repoDir);
      console.log(`Cleared commands for ${repoKey}`);
    }
  }
}

export async function updateCommand(options) {
  try {
    const isLocal = !options.global;
    const config = await loadJumonConfig(isLocal);
    
    if (!config.repositories || Object.keys(config.repositories).length === 0) {
      console.log('No repositories to update (jumon.json is empty or not found)');
      return;
    }
    
    console.log('Updating lock file...');
    await updateLockFile(config, isLocal);
    
    console.log('Clearing commands directory...');
    await clearCommandsDirectory(config, isLocal);
    
    console.log('Reinstalling commands...');
    await installCommand(options);
    
    console.log('\n🎉 Update complete!');
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}