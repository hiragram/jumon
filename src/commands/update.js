import path from 'path';
import fs from 'fs-extra';
import { resolveRepositoryRevision } from '../utils/github.js';
import { ensureCommandsDir } from '../utils/paths.js';
import { loadJumonConfig, loadJumonLock, saveJumonLock } from '../utils/config.js';
import { parseRepositoryKey, validateRepositoryConfig } from '../utils/repository.js';
import { handleCommandError, logError, logWarning } from '../utils/errors.js';
import { installCommand } from './install.js';


async function updateLockFile(config, isLocal) {
  const lock = await loadJumonLock(isLocal);
  
  if (!lock.repositories) {
    lock.repositories = {};
  }
  
  for (const [repoKey, repoConfig] of Object.entries(config.repositories)) {
    try {
      const { user, repo } = parseRepositoryKey(repoKey);
      
      if (!validateRepositoryConfig(repoConfig)) {
        logError(`Invalid configuration for ${repoKey}, skipping`);
        continue;
      }
      
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
      logError(`Failed to update ${repoKey}: ${error.message}`);
    }
  }
  
  await saveJumonLock(lock, isLocal);
  return lock;
}

async function clearCommandsDirectory(config, isLocal) {
  const commandsDir = await ensureCommandsDir(isLocal);
  
  // Clear each repository's commands
  for (const repoKey of Object.keys(config.repositories)) {
    const { user, repo } = parseRepositoryKey(repoKey);
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
    await installCommand({ ...options, skipLockFileSave: true });
    
    console.log('\n🎉 Update complete!');
    
  } catch (error) {
    handleCommandError(error, 'Update command');
  }
}