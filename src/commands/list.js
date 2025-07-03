import path from 'path';
import fs from 'fs-extra';
import { getCommandsPath, getLocalCommandsPath, getGlobalCommandsPath } from '../utils/paths.js';
import { loadCccscLock } from '../utils/config.js';

async function listCommandsInDirectory(commandsPath, title, isGlobal = false) {
  if (!(await fs.pathExists(commandsPath))) {
    console.log(title);
    console.log('  No commands found');
    return [];
  }
  
  const commands = [];
  
  try {
    const entries = await fs.readdir(commandsPath);
    
    for (const userDir of entries) {
      try {
        const userPath = path.join(commandsPath, userDir);
        const stat = await fs.stat(userPath);
        
        if (stat.isDirectory()) {
          const repos = await fs.readdir(userPath);
          
          for (const repoDir of repos) {
            try {
              const repoPath = path.join(userPath, repoDir);
              const repoStat = await fs.stat(repoPath);
              
              if (repoStat.isDirectory()) {
                const files = await fs.readdir(repoPath);
                
                for (const file of files) {
                  if (file.endsWith('.md')) {
                    const commandName = file.replace('.md', '');
                    const prefix = isGlobal ? '/user:' : '/project:';
                    commands.push({
                      name: commandName,
                      repository: `${userDir}/${repoDir}`,
                      displayName: `${prefix}${commandName}`
                    });
                  }
                }
              }
            } catch (error) {
              // Skip invalid entries
            }
          }
        }
      } catch (error) {
        // Skip invalid entries
      }
    }
  } catch (error) {
    // Handle readdir errors
  }
  
  console.log(title);
  if (commands.length === 0) {
    console.log('  No commands found');
  } else {
    for (const cmd of commands) {
      console.log(`  ${cmd.displayName} (${cmd.repository})`);
    }
  }
  
  return commands;
}

export async function listCommand(options) {
  try {
    if (options.global && !options.local) {
      const globalPath = getGlobalCommandsPath();
      await listCommandsInDirectory(globalPath, '🌍 Global Commands (~/.claude/commands/)', true);
    } else if (options.local && !options.global) {
      const localPath = getLocalCommandsPath();
      await listCommandsInDirectory(localPath, '📍 Local Commands (.claude/commands/)', false);
    } else {
      const localPath = getLocalCommandsPath();
      const globalPath = getGlobalCommandsPath();
      
      const localCommands = await listCommandsInDirectory(localPath, '📍 Local Commands (.claude/commands/)', false);
      const globalCommands = await listCommandsInDirectory(globalPath, '🌍 Global Commands (~/.claude/commands/)', true);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}