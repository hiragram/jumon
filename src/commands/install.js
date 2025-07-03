import path from 'path';
import fs from 'fs-extra';
import { getFileContent, findMarkdownFiles } from '../utils/github.js';
import { ensureCommandsDir } from '../utils/paths.js';
import { loadCccscLock, loadCccscConfig, saveCccscLock } from '../utils/config.js';
import { parseRepositoryKey, validateRepositoryConfig } from '../utils/repository.js';
import { logError, logSuccess, logWarning } from '../utils/errors.js';
import { ErrorTypes } from '../utils/error-types.js';
import { createCommandObjectsFromNames } from '../utils/lock-helpers.js';
import { CommandError, handleCommandError as handleError } from '../utils/command-error.js';
import { writeTextFile } from '../utils/filesystem.js';

export async function installCommand(options) {
  try {
    const isLocal = !options.global;
    
    // Load config with enhanced error handling
    let config = null;
    try {
      config = await loadCccscConfig(isLocal);
    } catch (error) {
      if (error instanceof CommandError) {
        switch (error.type) {
          case ErrorTypes.CONFIG_PARSE_ERROR:
            logError(`Config file is corrupted (JSON parse error): ${error.message}`);
            logError('Please check your cccsc.json file for syntax errors.');
            process.exit(1);
            break;
          case ErrorTypes.PERMISSION_ERROR:
            logError(`Permission denied reading config file: ${error.message}`);
            logError('Please check file permissions for cccsc.json');
            process.exit(1);
            break;
          case ErrorTypes.FILE_NOT_FOUND:
            logWarning('Config file not found, using empty config');
            config = { repositories: {} };
            break;
          default:
            logError(`Unexpected error loading config: ${error.message} (Type: ${error.type})`);
            logError('Using empty config as fallback');
            config = { repositories: {} };
            break;
        }
      } else {
        throw CommandError.fromError(error, ErrorTypes.CONFIG_READ_ERROR, { isLocal });
      }
    }
    
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
        const installedCommandNames = [];
        
        if (repoConfig.only && repoConfig.only.length > 0) {
          // Install specific commands
          for (const commandDef of repoConfig.only) {
            try {
              const filePath = commandDef.path.endsWith('.md') ? commandDef.path : `${commandDef.path}.md`;
              const content = await getFileContent(user, repo, filePath, branch);
              const commandName = commandDef.alias || commandDef.name;
              const targetFile = path.join(targetDir, `${commandName}.md`);
              
              await writeTextFile(targetFile, content);
              logSuccess(`Installed ${commandName}`);
              installedCommands++;
              installedCommandNames.push(commandDef.name);
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
                
                await writeTextFile(targetFile, content);
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
          const repoConfig = config?.repositories?.[repoKey];
          
          if (repoConfig?.only && repoConfig.only.length > 0) {
            // Use config information to preserve alias
            lock.repositories[repoKey].only = repoConfig.only.map(cmd => ({
              name: cmd.name,
              path: cmd.path,
              alias: cmd.alias
            }));
          } else {
            // Fallback for commands installed without config
            lock.repositories[repoKey].only = createCommandObjectsFromNames(installedCommandNames);
          }
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
    handleError(error, 'Install command');
  }
}