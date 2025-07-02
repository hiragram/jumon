import path from 'path';
import fs from 'fs-extra';
import { getCommandsPath, getLocalCommandsPath, getGlobalCommandsPath } from '../utils/paths.js';
import { loadJumonLock } from '../utils/config.js';

async function listCommandsInDirectory(commandsPath, title) {
  if (!(await fs.pathExists(commandsPath))) {
    console.log(`${title}: No commands installed`);
    return;
  }
  
  const commands = [];
  const entries = await fs.readdir(commandsPath);
  
  for (const userDir of entries) {
    const userPath = path.join(commandsPath, userDir);
    const stat = await fs.stat(userPath);
    
    if (stat.isDirectory()) {
      const repos = await fs.readdir(userPath);
      
      for (const repoDir of repos) {
        const repoPath = path.join(userPath, repoDir);
        const repoStat = await fs.stat(repoPath);
        
        if (repoStat.isDirectory()) {
          const files = await fs.readdir(repoPath);
          
          for (const file of files) {
            if (file.endsWith('.md')) {
              const commandName = file.replace('.md', '');
              commands.push({
                name: commandName,
                repository: `${userDir}/${repoDir}`,
                path: path.join(repoPath, file)
              });
            }
          }
        }
      }
    }
  }
  
  if (commands.length === 0) {
    console.log(`${title}: No commands installed`);
  } else {
    console.log(`${title}:`);
    for (const cmd of commands) {
      console.log(`  ${cmd.name} (from ${cmd.repository})`);
    }
  }
  
  return commands;
}

export async function listCommand(options) {
  try {
    if (options.global && !options.local) {
      const globalPath = getGlobalCommandsPath();
      await listCommandsInDirectory(globalPath, 'Global Commands');
    } else if (options.local && !options.global) {
      const localPath = getLocalCommandsPath();
      await listCommandsInDirectory(localPath, 'Local Commands');
    } else {
      const localPath = getLocalCommandsPath();
      const globalPath = getGlobalCommandsPath();
      
      const localCommands = await listCommandsInDirectory(localPath, 'Local Commands');
      console.log('');
      const globalCommands = await listCommandsInDirectory(globalPath, 'Global Commands');
      
      const totalCommands = (localCommands?.length || 0) + (globalCommands?.length || 0);
      if (totalCommands > 0) {
        console.log(`\nTotal: ${totalCommands} commands installed`);
      }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}