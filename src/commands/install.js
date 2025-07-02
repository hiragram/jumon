import path from 'path';
import fs from 'fs-extra';
import { getFileContent, findMarkdownFiles, parseRepositoryPath } from '../utils/github.js';
import { ensureCommandsDir } from '../utils/paths.js';
import { loadJumonLock, loadJumonConfig } from '../utils/config.js';

export async function installCommand(options) {
  try {
    const isLocal = !options.global;
    const config = await loadJumonConfig(isLocal);
    const lock = await loadJumonLock(isLocal);
    
    if (!config.commands || Object.keys(config.commands).length === 0) {
      console.log('No commands to install (jumon.json is empty or not found)');
      return;
    }
    
    if (!lock.repositories || Object.keys(lock.repositories).length === 0) {
      console.log('No locked repositories found (jumon-lock.json is empty or not found)');
      return;
    }
    
    const commandsDir = await ensureCommandsDir(isLocal);
    const commandEntries = Object.entries(config.commands);
    
    console.log(`Installing commands from ${commandEntries.length} repository entries...`);
    
    for (const [repoPath, commandConfig] of commandEntries) {
      try {
        const { user, repo, commandPath } = parseRepositoryPath(repoPath);
        const repoKey = `${user}/${repo}`;
        const lockInfo = lock.repositories[repoKey];
        
        if (!lockInfo) {
          console.error(`✗ No lock information found for ${repoKey}`);
          continue;
        }
        
        const targetDir = path.join(commandsDir, user, repo);
        await fs.ensureDir(targetDir);
        
        if (commandPath) {
          // Install specific command
          const filePath = commandPath.endsWith('.md') ? commandPath : `${commandPath}.md`;
          const commandName = commandConfig.alias || path.basename(commandPath);
          
          const content = await getFileContent(user, repo, filePath);
          const targetFile = path.join(targetDir, `${commandName}.md`);
          await fs.writeFile(targetFile, content);
          
          console.log(`✓ Installed ${commandName} from ${repoKey}@${lockInfo.revision.substring(0, 7)}`);
        } else {
          // Install commands from repository (all or only specified ones)
          const files = await findMarkdownFiles(user, repo);
          const onlyCommands = lockInfo.only || [];
          
          const filesToInstall = onlyCommands.length > 0 
            ? files.filter(file => onlyCommands.includes(file.name))
            : files;
          
          for (const file of filesToInstall) {
            const content = await getFileContent(user, repo, file.path);
            const targetFile = path.join(targetDir, file.name + '.md');
            await fs.writeFile(targetFile, content);
            
            console.log(`✓ Installed ${file.name} from ${repoKey}@${lockInfo.revision.substring(0, 7)}`);
          }
          
          if (onlyCommands.length > 0) {
            console.log(`  (Only installing: ${onlyCommands.join(', ')})`);
          }
        }
        
      } catch (error) {
        console.error(`✗ Failed to install from ${repoPath}: ${error.message}`);
      }
    }
    
    console.log(`✓ Installation complete`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}