import path from 'path';
import fs from 'fs-extra';
import { getFileContent } from '../utils/github.js';
import { ensureCommandsDir } from '../utils/paths.js';
import { loadJumonLock } from '../utils/config.js';

export async function installCommand(options) {
  try {
    const isLocal = !options.global;
    const lock = await loadJumonLock(isLocal);
    
    if (!lock.commands || Object.keys(lock.commands).length === 0) {
      console.log('No commands to install (jumon-lock.json is empty or not found)');
      return;
    }
    
    const commandsDir = await ensureCommandsDir(isLocal);
    const commands = Object.entries(lock.commands);
    
    console.log(`Installing ${commands.length} commands...`);
    
    for (const [commandName, info] of commands) {
      try {
        const [user, repo] = info.repository.split('/');
        const targetDir = path.join(commandsDir, user, repo);
        await fs.ensureDir(targetDir);
        
        const content = await getFileContent(user, repo, info.path);
        const targetFile = path.join(targetDir, `${commandName}.md`);
        await fs.writeFile(targetFile, content);
        
        console.log(`✓ Installed ${commandName} (from ${info.repository})`);
      } catch (error) {
        console.error(`✗ Failed to install ${commandName}: ${error.message}`);
      }
    }
    
    console.log(`✓ Installation complete`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}