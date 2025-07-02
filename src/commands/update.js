import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';
import { createInterface } from 'readline';
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

async function promptUser(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

function createSimpleDiff(oldContent, newContent, filename) {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  let diff = [`--- ${filename} (current)`, `+++ ${filename} (new)`, ''];
  let hasChanges = false;
  
  const maxLines = Math.max(oldLines.length, newLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] || '';
    const newLine = newLines[i] || '';
    
    if (oldLine !== newLine) {
      hasChanges = true;
      if (oldLines[i] !== undefined) {
        diff.push(`-${oldLine}`);
      }
      if (newLines[i] !== undefined) {
        diff.push(`+${newLine}`);
      }
    } else if (hasChanges && oldLine === newLine) {
      // Show a few context lines after changes
      diff.push(` ${oldLine}`);
      if (diff.filter(l => l.startsWith(' ')).length >= 3) {
        hasChanges = false;
      }
    }
  }
  
  return diff.length > 3 ? diff : null;
}

async function previewRepositoryChanges(user, repo, repoConfig, lockInfo, isLocal) {
  const commandsDir = await ensureCommandsDir(isLocal);
  const targetDir = path.join(commandsDir, user, repo);
  
  let changes = [];
  let filesToUpdate = [];
  
  if (repoConfig.only && repoConfig.only.length > 0) {
    // Check specific commands defined in config
    for (const commandDef of repoConfig.only) {
      try {
        const filePath = commandDef.path.endsWith('.md') ? commandDef.path : `${commandDef.path}.md`;
        const newContent = await getFileContent(user, repo, filePath);
        const localFile = path.join(targetDir, `${commandDef.name}.md`);
        
        let oldContent = '';
        if (await fs.pathExists(localFile)) {
          oldContent = await fs.readFile(localFile, 'utf-8');
        }
        
        if (oldContent !== newContent) {
          const diff = createSimpleDiff(oldContent, newContent, `${commandDef.name}.md`);
          if (diff) {
            changes.push({
              file: commandDef.name,
              diff: diff,
              type: oldContent ? 'modified' : 'new'
            });
            filesToUpdate.push({
              name: commandDef.name,
              path: localFile,
              content: newContent
            });
          }
        }
      } catch (error) {
        console.error(`✗ Failed to preview ${commandDef.name}: ${error.message}`);
      }
    }
  } else {
    // Check all commands from repository
    const files = await findMarkdownFiles(user, repo);
    const onlyCommands = lockInfo?.only || [];
    
    const filesToCheck = onlyCommands.length > 0 
      ? files.filter(file => onlyCommands.includes(file.name))
      : files;
    
    for (const file of filesToCheck) {
      try {
        const newContent = await getFileContent(user, repo, file.path);
        const localFile = path.join(targetDir, file.name + '.md');
        
        let oldContent = '';
        if (await fs.pathExists(localFile)) {
          oldContent = await fs.readFile(localFile, 'utf-8');
        }
        
        if (oldContent !== newContent) {
          const diff = createSimpleDiff(oldContent, newContent, `${file.name}.md`);
          if (diff) {
            changes.push({
              file: file.name,
              diff: diff,
              type: oldContent ? 'modified' : 'new'
            });
            filesToUpdate.push({
              name: file.name,
              path: localFile,
              content: newContent
            });
          }
        }
      } catch (error) {
        console.error(`✗ Failed to preview ${file.name}: ${error.message}`);
      }
    }
  }
  
  return { changes, filesToUpdate };
}

async function applyChanges(filesToUpdate) {
  const installedCommands = [];
  
  for (const file of filesToUpdate) {
    try {
      await fs.ensureDir(path.dirname(file.path));
      await fs.writeFile(file.path, file.content);
      installedCommands.push(file.name);
      console.log(`✓ Updated ${file.name}`);
    } catch (error) {
      console.error(`✗ Failed to update ${file.name}: ${error.message}`);
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
    console.log(`Checking updates for ${repositoryEntries.length} repositories...\n`);
    
    let repositoriesToUpdate = [];
    
    // First pass: check for updates and preview changes
    for (const [repoKey, repoConfig] of repositoryEntries) {
      try {
        const [user, repo] = repoKey.split('/');
        console.log(`Checking ${repoKey}...`);
        
        // Resolve the target revision based on version/branch/tag
        const newRevision = await resolveRepositoryRevision(user, repo, repoConfig);
        
        // Check if we need to update
        const existingLockInfo = lock.repositories?.[repoKey];
        const currentRevision = existingLockInfo?.revision;
        
        if (currentRevision === newRevision) {
          console.log(`  Already up to date (${newRevision.substring(0, 7)})`);
          continue;
        }
        
        console.log(`  Revision change: ${currentRevision?.substring(0, 7) || 'unknown'} → ${newRevision.substring(0, 7)}`);
        
        // Preview changes
        const { changes, filesToUpdate } = await previewRepositoryChanges(user, repo, repoConfig, existingLockInfo, isLocal);
        
        if (changes.length === 0) {
          console.log(`  No file changes detected`);
          // Still update the lock file with new revision
          repositoriesToUpdate.push({
            repoKey,
            newRevision,
            filesToUpdate: [],
            changes: []
          });
        } else {
          console.log(`  Found ${changes.length} file changes:`);
          for (const change of changes) {
            console.log(`    ${change.type === 'new' ? '📄 NEW' : '📝 MODIFIED'}: ${change.file}.md`);
          }
          
          repositoriesToUpdate.push({
            repoKey,
            newRevision,
            filesToUpdate,
            changes
          });
        }
        
      } catch (error) {
        console.error(`✗ Failed to check updates for ${repoKey}: ${error.message}`);
      }
    }
    
    if (repositoriesToUpdate.length === 0) {
      console.log('\n🎉 All repositories are up to date!');
      return;
    }
    
    // Show diff for repositories with file changes
    const reposWithChanges = repositoriesToUpdate.filter(repo => repo.changes.length > 0);
    
    if (reposWithChanges.length > 0) {
      console.log(`\n📋 Detailed changes preview:\n`);
      
      for (const repoUpdate of reposWithChanges) {
        console.log(`Repository: ${repoUpdate.repoKey}`);
        console.log('─'.repeat(50));
        
        for (const change of repoUpdate.changes) {
          console.log(`\n${change.diff.join('\n')}`);
        }
        console.log('\n');
      }
      
      // Ask for confirmation
      const answer = await promptUser(`Apply these changes? (y/N): `);
      
      if (answer !== 'y' && answer !== 'yes') {
        console.log('Update cancelled.');
        return;
      }
    }
    
    console.log('\nApplying updates...\n');
    
    let updatedCount = 0;
    
    // Apply updates
    for (const repoUpdate of repositoriesToUpdate) {
      try {
        // Apply file changes
        const installedCommands = await applyChanges(repoUpdate.filesToUpdate);
        
        // Update lock file
        if (!lock.repositories) {
          lock.repositories = {};
        }
        
        lock.repositories[repoUpdate.repoKey] = {
          revision: repoUpdate.newRevision,
          only: installedCommands.length > 0 ? installedCommands : (lock.repositories[repoUpdate.repoKey]?.only || [])
        };
        
        updatedCount++;
        console.log(`✓ Updated ${repoUpdate.repoKey} (${installedCommands.length} files)`);
        
      } catch (error) {
        console.error(`✗ Failed to update ${repoUpdate.repoKey}: ${error.message}`);
      }
    }
    
    // Save updated lock file
    await saveJumonLock(lock, isLocal);
    
    console.log(`\n🎉 Update complete!`);
    console.log(`  Updated: ${updatedCount} repositories`);
    console.log(`  Unchanged: ${repositoryEntries.length - repositoriesToUpdate.length} repositories`);
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}