import path from 'path';
import fs from 'fs-extra';
import { getFileContent, findMarkdownFiles } from '../utils/github.js';
import { ensureCommandsDir } from '../utils/paths.js';
import { loadCccscLock, loadCccscConfig, saveCccscLock } from '../utils/config.js';
import { parseRepositoryKey, validateRepositoryConfig } from '../utils/repository.js';
import { handleCommandError, logError, logSuccess, logWarning } from '../utils/errors.js';

export async function installCommand(options) {
  try {
    const isLocal = !options.global;
    const config = await loadCccscConfig(isLocal);
    const lock = await loadCccscLock(isLocal);
    
    if (!lock.repositories || Object.keys(lock.repositories).length === 0) {
      console.log('No repositories to install (cccsc-lock.json is empty or not found)');
      return;
    }
    
    const commandsDir = await ensureCommandsDir(isLocal);
    let totalInstalled = 0;
    const repositoryCount = Object.keys(lock.repositories).length;
    
    for (const [repoKey, lockInfo] of Object.entries(lock.repositories)) {
      try {
        const { user, repo } = parseRepositoryKey(repoKey);
        const repoConfig = config.repositories?.[repoKey];
        
        if (!repoConfig) {
          logError(`No configuration found for ${repoKey}, skipping`);
          continue;
        }
        
        if (!validateRepositoryConfig(repoConfig)) {
          logError(`Invalid configuration for ${repoKey}, skipping`);
          continue;
        }
        
        const branch = repoConfig.branch || 'main';
        const targetDir = path.join(commandsDir, user, repo);
        await fs.ensureDir(targetDir);
        
        let installedCommands = 0;
        let installedCommandNames = [];
        
        if (repoConfig.only && repoConfig.only.length > 0) {
          // Install specific commands
          for (const commandDef of repoConfig.only) {
            try {
              const filePath = commandDef.path.endsWith('.md') ? commandDef.path : `${commandDef.path}.md`;
              const content = await getFileContent(user, repo, filePath, branch);
              const commandName = commandDef.alias || commandDef.name;
              const targetFile = path.join(targetDir, `${commandName}.md`);
              
              await fs.writeFile(targetFile, content);
              logSuccess(`Installed ${commandName}`);
              installedCommands++;
              installedCommandNames.push(commandName);
            } catch (error) {
              logError(`Failed to install ${commandDef.name}: ${error.message}`);
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
                logSuccess(`Installed ${file.name}`);
                installedCommands++;
                installedCommandNames.push(file.name);
              } catch (error) {
                logError(`Failed to install ${file.name}: ${error.message}`);
              }
            }
          } catch (error) {
            logError(`Failed to install commands from ${repoKey}: ${error.message}`);
          }
        }
        
        // Update lock file with actually installed commands
        if (lock.repositories[repoKey]) {
          lock.repositories[repoKey].only = installedCommandNames;
        } else {
          // This should not happen normally, but let's be safe
          logWarning(`Lock file entry for ${repoKey} not found, skipping lock update`);
        }
        
        totalInstalled += installedCommands;
      } catch (error) {
        logError(`Failed to process repository ${repoKey}: ${error.message}`);
      }
    }
    
    // Save updated lock file (unless skipped)
    if (!options.skipLockFileSave) {
      await saveCccscLock(lock, isLocal);
    }
    
    console.log(`✓ Installed ${totalInstalled} commands from ${repositoryCount} repositories`);
  } catch (error) {
    handleCommandError(error, 'Install command');
  }
}