import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';
import { getFileContent, findMarkdownFiles, getLatestCommitHash } from '../utils/github.js';
import { ensureCommandsDir } from '../utils/paths.js';
import { loadJumonConfig, loadJumonLock, saveJumonLock } from '../utils/config.js';

async function resolveRepositoryRevision(user, repo, repoConfig) {
  if (repoConfig.version) {
    // For now, treat version as a tag. In the future, this could resolve version ranges
    const tagName = repoConfig.version.replace(/^[~^>=<\s]+/, ''); // Strip version operators
    try {
      // Try to get commit hash for the tag
      const response = await axios.get(`https://api.github.com/repos/${user}/${repo}/git/refs/tags/${tagName}`);
      return response.data.object.sha;
    } catch (error) {
      console.warn(`Failed to resolve version ${repoConfig.version} for ${user}/${repo}, falling back to latest commit`);
    }
    // Fallback to latest commit on main branch
    return await getLatestCommitHash(user, repo);
  } else if (repoConfig.tag) {
    // Get commit hash for specific tag
    try {
      const response = await axios.get(`https://api.github.com/repos/${user}/${repo}/git/refs/tags/${repoConfig.tag}`);
      return response.data.object.sha;
    } catch (error) {
      console.warn(`Failed to resolve tag ${repoConfig.tag} for ${user}/${repo}, falling back to latest commit`);
    }
    // Fallback to latest commit on main branch
    return await getLatestCommitHash(user, repo);
  } else {
    // Use specific branch or default to main
    const branch = repoConfig.branch || 'main';
    return await getLatestCommitHash(user, repo, branch);
  }
}

async function updateRepositoryCommands(user, repo, repoConfig, lockInfo, isLocal) {
  const commandsDir = await ensureCommandsDir(isLocal);
  const targetDir = path.join(commandsDir, user, repo);
  await fs.ensureDir(targetDir);
  
  let installedCommands = [];
  
  if (repoConfig.only && repoConfig.only.length > 0) {
    // Install specific commands defined in config
    for (const commandDef of repoConfig.only) {
      try {
        const filePath = commandDef.path.endsWith('.md') ? commandDef.path : `${commandDef.path}.md`;
        const content = await getFileContent(user, repo, filePath);
        const targetFile = path.join(targetDir, `${commandDef.name}.md`);
        await fs.writeFile(targetFile, content);
        
        installedCommands.push(commandDef.name);
        console.log(`✓ Updated ${commandDef.name}`);
      } catch (error) {
        console.error(`✗ Failed to update ${commandDef.name}: ${error.message}`);
      }
    }
  } else {
    // Install all commands from repository
    const files = await findMarkdownFiles(user, repo);
    const onlyCommands = lockInfo.only || [];
    
    const filesToInstall = onlyCommands.length > 0 
      ? files.filter(file => onlyCommands.includes(file.name))
      : files;
    
    for (const file of filesToInstall) {
      try {
        const content = await getFileContent(user, repo, file.path);
        const targetFile = path.join(targetDir, file.name + '.md');
        await fs.writeFile(targetFile, content);
        
        installedCommands.push(file.name);
        console.log(`✓ Updated ${file.name}`);
      } catch (error) {
        console.error(`✗ Failed to update ${file.name}: ${error.message}`);
      }
    }
  }
  
  return installedCommands;
}

export async function updateCommand(options) {
  try {
    const isLocal = !options.global;
    const config = await loadJumonConfig(isLocal);
    const lock = await loadJumonLock(isLocal);
    
    if (!config.repositories || Object.keys(config.repositories).length === 0) {
      console.log('No repositories to update (jumon.json is empty or not found)');
      return;
    }
    
    const repositoryEntries = Object.entries(config.repositories);
    console.log(`Updating ${repositoryEntries.length} repositories...`);
    
    let updatedCount = 0;
    let unchangedCount = 0;
    
    for (const [repoKey, repoConfig] of repositoryEntries) {
      try {
        const [user, repo] = repoKey.split('/');
        console.log(`\nChecking ${repoKey}...`);
        
        // Resolve the target revision based on version/branch/tag
        const newRevision = await resolveRepositoryRevision(user, repo, repoConfig);
        
        // Check if we need to update
        const existingLockInfo = lock.repositories?.[repoKey];
        const currentRevision = existingLockInfo?.revision;
        
        if (currentRevision === newRevision) {
          console.log(`  Already up to date (${newRevision.substring(0, 7)})`);
          unchangedCount++;
          continue;
        }
        
        console.log(`  Updating from ${currentRevision?.substring(0, 7) || 'unknown'} to ${newRevision.substring(0, 7)}`);
        
        // Update commands
        const installedCommands = await updateRepositoryCommands(user, repo, repoConfig, existingLockInfo, isLocal);
        
        // Update lock file
        if (!lock.repositories) {
          lock.repositories = {};
        }
        
        lock.repositories[repoKey] = {
          revision: newRevision,
          only: installedCommands
        };
        
        updatedCount++;
        console.log(`  ✓ Updated ${repoKey} (${installedCommands.length} commands)`);
        
      } catch (error) {
        console.error(`✗ Failed to update ${repoKey}: ${error.message}`);
      }
    }
    
    // Save updated lock file
    await saveJumonLock(lock, isLocal);
    
    console.log(`\n🎉 Update complete!`);
    console.log(`  Updated: ${updatedCount} repositories`);
    console.log(`  Unchanged: ${unchangedCount} repositories`);
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}