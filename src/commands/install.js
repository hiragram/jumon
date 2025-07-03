import path from 'path';
import fs from 'fs-extra';
import { getFileContent, findMarkdownFiles } from '../utils/github.js';
import { ensureCommandsDir } from '../utils/paths.js';
import { loadJumonLock, loadJumonConfig } from '../utils/config.js';

export async function installCommand(options) {
  try {
    const isLocal = !options.global;
    const config = await loadJumonConfig(isLocal);
    const lock = await loadJumonLock(isLocal);
    
    if (!lock.repositories || Object.keys(lock.repositories).length === 0) {
      console.log('No repositories to install (jumon-lock.json is empty or not found)');
      return;
    }
    
    const commandsDir = await ensureCommandsDir(isLocal);
    let totalInstalled = 0;
    const repositoryCount = Object.keys(lock.repositories).length;
    
    for (const [repoKey, lockInfo] of Object.entries(lock.repositories)) {
      try {
        const [user, repo] = repoKey.split('/');
        const repoConfig = config.repositories?.[repoKey];
        
        if (!repoConfig) {
          console.error(`✗ No configuration found for ${repoKey}, skipping`);
          continue;
        }
        
        const branch = repoConfig.branch || 'main';
        const targetDir = path.join(commandsDir, user, repo);
        await fs.ensureDir(targetDir);
        
        let installedCommands = 0;
        
        if (repoConfig.only && repoConfig.only.length > 0) {
          // Install specific commands
          for (const commandDef of repoConfig.only) {
            try {
              const filePath = commandDef.path.endsWith('.md') ? commandDef.path : `${commandDef.path}.md`;
              const content = await getFileContent(user, repo, filePath, branch);
              const commandName = commandDef.alias || commandDef.name;
              const targetFile = path.join(targetDir, `${commandName}.md`);
              
              await fs.writeFile(targetFile, content);
              console.log(`✓ Installed ${commandName}`);
              installedCommands++;
            } catch (error) {
              console.error(`✗ Failed to install ${commandDef.name}: ${error.message}`);
            }
          }
        } else {
          // Install all commands from repository
          try {
            const files = await findMarkdownFiles(user, repo, '', branch);
            
            for (const file of files) {
              try {
                const content = await getFileContent(user, repo, file.path, branch);
                const targetFile = path.join(targetDir, file.name + '.md');
                
                await fs.writeFile(targetFile, content);
                console.log(`✓ Installed ${file.name}`);
                installedCommands++;
              } catch (error) {
                console.error(`✗ Failed to install ${file.name}: ${error.message}`);
              }
            }
          } catch (error) {
            console.error(`✗ Failed to install commands from ${repoKey}: ${error.message}`);
          }
        }
        
        totalInstalled += installedCommands;
      } catch (error) {
        console.error(`✗ Failed to process repository ${repoKey}: ${error.message}`);
      }
    }
    
    console.log(`✓ Installed ${totalInstalled} commands from ${repositoryCount} repositories`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}