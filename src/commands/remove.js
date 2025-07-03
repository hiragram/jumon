import path from 'path';
import fs from 'fs-extra';
import { getCommandsPath } from '../utils/paths.js';
import { loadCccscConfig, saveCccscConfig, loadCccscLock, saveCccscLock } from '../utils/config.js';

async function findCommandInConfig(commandName, config, isLocal = false) {
  if (!config.repositories) {
    return null;
  }
  
  for (const [repoKey, repoConfig] of Object.entries(config.repositories)) {
    if (repoConfig.only && repoConfig.only.length > 0) {
      // Check specific commands
      const commandIndex = repoConfig.only.findIndex(cmd => 
        cmd.name === commandName || cmd.alias === commandName
      );
      
      if (commandIndex !== -1) {
        return {
          repoKey,
          commandIndex,
          command: repoConfig.only[commandIndex]
        };
      }
    } else if (repoConfig.only && repoConfig.only.length === 0) {
      // Check if command exists in all-commands repository
      const [user, repo] = repoKey.split('/');
      const commandsPath = getCommandsPath(isLocal);
      const commandFile = path.join(commandsPath, user, repo, `${commandName}.md`);
      
      if (await fs.pathExists(commandFile)) {
        return {
          repoKey,
          commandIndex: -1, // -1 indicates all-commands mode
          command: { name: commandName, path: `${commandName}.md`, alias: null }
        };
      }
    }
  }
  
  return null;
}

async function removeCommandFromLock(commandName, repoKey, lock) {
  if (!lock.repositories || !lock.repositories[repoKey]) {
    return false;
  }
  
  const repoLock = lock.repositories[repoKey];
  if (repoLock.only && repoLock.only.length > 0) {
    const commandIndex = repoLock.only.indexOf(commandName);
    if (commandIndex !== -1) {
      repoLock.only.splice(commandIndex, 1);
      
      // If no commands left, remove the repository entry
      if (repoLock.only.length === 0) {
        delete lock.repositories[repoKey];
      }
      
      return true;
    }
  } else if (repoLock.only && repoLock.only.length === 0) {
    // For all-commands mode, we don't track individual commands in lock
    // But we should check if this was the last command in the repository
    const [user, repo] = repoKey.split('/');
    const commandsPath = getCommandsPath();
    const repoPath = path.join(commandsPath, user, repo);
    
    if (await fs.pathExists(repoPath)) {
      const remainingFiles = await fs.readdir(repoPath).catch(() => []);
      const mdFiles = remainingFiles.filter(f => f.endsWith('.md'));
      
      if (mdFiles.length <= 1) { // Only the file being deleted
        delete lock.repositories[repoKey];
        return true;
      }
    }
  }
  
  return false;
}

async function findAndRemoveCommand(commandName, commandsPath) {
  const entries = await fs.readdir(commandsPath).catch(() => []);
  
  for (const userDir of entries) {
    const userPath = path.join(commandsPath, userDir);
    const stat = await fs.stat(userPath).catch(() => null);
    
    if (stat?.isDirectory()) {
      const repos = await fs.readdir(userPath).catch(() => []);
      
      for (const repoDir of repos) {
        const repoPath = path.join(userPath, repoDir);
        const repoStat = await fs.stat(repoPath).catch(() => null);
        
        if (repoStat?.isDirectory()) {
          const commandFile = path.join(repoPath, `${commandName}.md`);
          
          if (await fs.pathExists(commandFile)) {
            await fs.remove(commandFile);
            
            const remainingFiles = await fs.readdir(repoPath).catch(() => []);
            if (remainingFiles.length === 0) {
              await fs.remove(repoPath);
              
              const remainingRepos = await fs.readdir(userPath).catch(() => []);
              if (remainingRepos.length === 0) {
                await fs.remove(userPath);
              }
            }
            
            return {
              removed: true,
              repository: `${userDir}/${repoDir}`,
              path: commandFile
            };
          }
        }
      }
    }
  }
  
  return { removed: false };
}


export async function removeCommand(commandName, options) {
  try {
    const isLocal = !options.global;
    const commandsPath = getCommandsPath(isLocal);
    
    if (!(await fs.pathExists(commandsPath))) {
      console.error(`No commands directory found`);
      process.exit(1);
    }
    
    const config = await loadCccscConfig(isLocal);
    const lock = await loadCccscLock(isLocal);
    
    // First try to find command in new configuration format
    const configResult = await findCommandInConfig(commandName, config, isLocal);
    
    if (configResult) {
      // Remove from new format
      const { repoKey, commandIndex, command } = configResult;
      const [user, repo] = repoKey.split('/');
      const commandFile = path.join(commandsPath, user, repo, `${command.name}.md`);
      
      // Remove file
      if (await fs.pathExists(commandFile)) {
        await fs.remove(commandFile);
        
        // Clean up empty directories
        const repoPath = path.join(commandsPath, user, repo);
        const remainingFiles = await fs.readdir(repoPath).catch(() => []);
        if (remainingFiles.length === 0) {
          await fs.remove(repoPath);
          
          const userPath = path.join(commandsPath, user);
          const remainingRepos = await fs.readdir(userPath).catch(() => []);
          if (remainingRepos.length === 0) {
            await fs.remove(userPath);
          }
        }
      }
      
      // Update config
      if (commandIndex === -1) {
        // All-commands mode - remove entire repository entry
        delete config.repositories[repoKey];
      } else {
        // Specific command mode - remove from only array
        config.repositories[repoKey].only.splice(commandIndex, 1);
        
        // If no commands left, remove repository entry
        if (config.repositories[repoKey].only.length === 0) {
          delete config.repositories[repoKey];
        }
      }
      
      // Update lock file
      await removeCommandFromLock(command.name, repoKey, lock, isLocal);
      
      await saveCccscConfig(config, isLocal);
      await saveCccscLock(lock, isLocal);
      
      console.log(`✓ Successfully removed command '${commandName}' (from ${repoKey})`);
      return;
    }
    
    // Fallback to filesystem search if not found in configuration
    const result = await findAndRemoveCommand(commandName, commandsPath);
    
    if (!result.removed) {
      console.error(`Command '${commandName}' not found`);
      process.exit(1);
    }
    
    console.log(`✓ Successfully removed command '${commandName}' (from ${result.repository})`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}