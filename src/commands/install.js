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
    
    if (!config.repositories || Object.keys(config.repositories).length === 0) {
      console.log('No repositories to install (jumon.json is empty or not found)');
      return;
    }
    
    if (!lock.repositories || Object.keys(lock.repositories).length === 0) {
      console.log('No locked repositories found (jumon-lock.json is empty or not found)');
      return;
    }
    
    const commandsDir = await ensureCommandsDir(isLocal);
    const repositoryEntries = Object.entries(config.repositories);
    
    console.log(`Installing commands from ${repositoryEntries.length} repositories...`);
    
    for (const [repoKey, repoConfig] of repositoryEntries) {
      try {
        const [user, repo] = repoKey.split('/');
        const lockInfo = lock.repositories[repoKey];
        
        if (!lockInfo) {
          console.error(`✗ No lock information found for ${repoKey}`);
          continue;
        }
        
        const targetDir = path.join(commandsDir, user, repo);
        await fs.ensureDir(targetDir);
        
        if (repoConfig.only && repoConfig.only.length > 0) {
          // Install specific commands defined in config
          for (const commandDef of repoConfig.only) {
            try {
              const filePath = commandDef.path.endsWith('.md') ? commandDef.path : `${commandDef.path}.md`;
              const content = await getFileContent(user, repo, filePath);
              const targetFile = path.join(targetDir, `${commandDef.name}.md`);
              await fs.writeFile(targetFile, content);
              
              console.log(`✓ Installed ${commandDef.name} from ${repoKey}@${lockInfo.revision.substring(0, 7)}`);
            } catch (error) {
              console.error(`✗ Failed to install ${commandDef.name}: ${error.message}`);
            }
          }
        } else {
          // Install all commands from repository (or only those specified in lock file)
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
        console.error(`✗ Failed to install from ${repoKey}: ${error.message}`);
      }
    }
    
    console.log(`✓ Installation complete`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}