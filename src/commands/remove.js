import path from 'path';
import fs from 'fs-extra';
import { getCommandsPath } from '../utils/paths.js';
import { loadJumonConfig, saveJumonConfig, loadJumonLock, saveJumonLock } from '../utils/config.js';

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
    const isLocal = options.local && !options.global;
    const commandsPath = getCommandsPath(isLocal);
    
    if (!(await fs.pathExists(commandsPath))) {
      console.error(`No commands directory found`);
      process.exit(1);
    }
    
    const result = await findAndRemoveCommand(commandName, commandsPath);
    
    if (!result.removed) {
      console.error(`Command '${commandName}' not found`);
      process.exit(1);
    }
    
    const config = await loadJumonConfig(isLocal);
    const lock = await loadJumonLock(isLocal);
    
    if (lock.commands && lock.commands[commandName]) {
      delete lock.commands[commandName];
      await saveJumonLock(lock, isLocal);
    }
    
    const commandEntries = Object.entries(config.commands || {});
    for (const [repoPath, settings] of commandEntries) {
      if (settings.alias === commandName || 
          (!settings.alias && repoPath.endsWith(`/${commandName}`))) {
        delete config.commands[repoPath];
        break;
      }
    }
    await saveJumonConfig(config, isLocal);
    
    console.log(`✓ Successfully removed command '${commandName}' (from ${result.repository})`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}