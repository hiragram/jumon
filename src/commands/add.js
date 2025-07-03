import path from 'path';
import fs from 'fs-extra';
import { parseRepositoryPath, getFileContent, findMarkdownFiles, resolveRepositoryRevision } from '../utils/github.js';
import { ensureCommandsDir } from '../utils/paths.js';
import { addRepositoryToConfig, addRepositoryToLock, loadCccscConfig } from '../utils/config.js';
import { createInterface } from 'readline';

async function checkCommandConflict(commandName, targetDir) {
  const existingFiles = await fs.readdir(targetDir).catch(() => []);
  
  for (const file of existingFiles) {
    const filePath = path.join(targetDir, file);
    const stat = await fs.stat(filePath);
    
    if (stat.isDirectory()) {
      const subFiles = await fs.readdir(filePath).catch(() => []);
      for (const subFile of subFiles) {
        if (subFile === `${commandName}.md`) {
          return path.join(filePath, subFile);
        }
      }
    } else if (file === `${commandName}.md`) {
      return filePath;
    }
  }
  
  return null;
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

async function checkRepositoryConflict(user, repo, commandPath, isLocal) {
  const config = await loadCccscConfig(isLocal);
  const repoKey = `${user}/${repo}`;
  
  if (!config.repositories || !config.repositories[repoKey]) {
    return { hasConflict: false };
  }
  
  const existingRepo = config.repositories[repoKey];
  
  // Check if all commands are already installed (empty only array)
  if (commandPath && existingRepo.only && existingRepo.only.length === 0) {
    return {
      hasConflict: true,
      type: 'all-to-specific',
      message: `Repository ${repoKey} is already configured to install ALL commands. ` +
               `Do you want to change it to install only the specific command '${commandPath.split('/').pop().replace('.md', '')}'?`
    };
  }
  
  // Check if specific commands are already installed but trying to install all
  if (!commandPath && existingRepo.only && existingRepo.only.length > 0) {
    const commandNames = existingRepo.only.map(cmd => cmd.name).join(', ');
    return {
      hasConflict: true,
      type: 'specific-to-all', 
      message: `Repository ${repoKey} is already configured to install specific commands: ${commandNames}. ` +
               `Do you want to change it to install ALL commands from this repository?`
    };
  }
  
  // Check if the same specific command is already configured
  if (commandPath && existingRepo.only && existingRepo.only.length > 0) {
    const commandName = commandPath.split('/').pop().replace('.md', '');
    const existingCommand = existingRepo.only.find(cmd => 
      cmd.path === commandPath || cmd.name === commandName
    );
    
    if (existingCommand) {
      return {
        hasConflict: true,
        type: 'same-command',
        message: `Command '${commandName}' is already configured for repository ${repoKey}. ` +
                 `Do you want to update it?`
      };
    }
  }
  
  return { hasConflict: false };
}

export async function addCommand(repository, options) {
  try {
    const isLocal = !options.global;
    const { user, repo, commandPath } = parseRepositoryPath(repository);
    
    console.log(`Adding command from ${user}/${repo}${commandPath ? `/${commandPath}` : ''}...`);
    
    // Check for repository configuration conflicts
    const conflict = await checkRepositoryConflict(user, repo, commandPath, isLocal);
    
    if (conflict.hasConflict) {
      console.log(`\n⚠️  ${conflict.message}`);
      const answer = await promptUser('Continue? (y/N): ');
      
      if (answer !== 'y' && answer !== 'yes') {
        console.log('Operation cancelled.');
        return;
      }
      console.log('');
    }
    
    if (commandPath) {
      const filePath = commandPath.endsWith('.md') ? commandPath : `${commandPath}.md`;
      const baseCommandName = path.basename(commandPath).replace(/\.md$/, '');
      const commandName = options.alias || baseCommandName;
      
      const commandsDir = await ensureCommandsDir(isLocal);
      const targetDir = path.join(commandsDir, user, repo);
      await fs.ensureDir(targetDir);
      
      const conflictPath = await checkCommandConflict(commandName, commandsDir);
      if (conflictPath && !options.alias) {
        console.error(`Error: Command '${commandName}' already exists at ${conflictPath}`);
        console.error(`Use --alias flag to install with a different name:`);
        console.error(`  cccsc add ${repository} --alias <new-name>`);
        process.exit(1);
      }
      
      try {
        const branch = options.branch || 'main';
        const content = await getFileContent(user, repo, filePath, branch);
        const targetFile = path.join(targetDir, `${commandName}.md`);
        await fs.writeFile(targetFile, content);
        
        const revision = await resolveRepositoryRevision(user, repo, { branch });
        
        await addRepositoryToConfig(user, repo, filePath, options.alias, branch, isLocal);
        await addRepositoryToLock(user, repo, revision, filePath, options.alias, isLocal);
        
        console.log(`✓ Successfully installed command '${commandName}' to ${targetFile}`);
        console.log(`  Repository: ${user}/${repo}@${revision.substring(0, 7)}`);
      } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    } else {
      const branch = options.branch || 'main';
      const files = await findMarkdownFiles(user, repo, '', branch);
      
      if (files.length === 0) {
        console.error(`No markdown files found in ${user}/${repo}`);
        process.exit(1);
      }
      
      const commandsDir = await ensureCommandsDir(isLocal);
      const targetDir = path.join(commandsDir, user, repo);
      await fs.ensureDir(targetDir);
      
      const conflicts = [];
      for (const file of files) {
        const conflictPath = await checkCommandConflict(file.name, commandsDir);
        if (conflictPath) {
          conflicts.push({ command: file.name, path: conflictPath });
        }
      }
      
      if (conflicts.length > 0) {
        console.error(`Error: The following commands already exist:`);
        for (const conflict of conflicts) {
          console.error(`  '${conflict.command}' at ${conflict.path}`);
        }
        console.error(`Please resolve conflicts manually or use specific command installation.`);
        process.exit(1);
      }
      
      console.log(`Installing ${files.length} commands...`);
      
      const revision = await resolveRepositoryRevision(user, repo, { branch });
      
      for (const file of files) {
        try {
          const content = await getFileContent(user, repo, file.path, branch);
          const targetFile = path.join(targetDir, file.name + '.md');
          await fs.writeFile(targetFile, content);
          
          console.log(`✓ Installed ${file.name}`);
        } catch (error) {
          console.error(`✗ Failed to install ${file.name}: ${error.message}`);
        }
      }
      
      await addRepositoryToConfig(user, repo, null, null, branch, isLocal);
      await addRepositoryToLock(user, repo, revision, null, null, isLocal);
      console.log(`✓ Successfully installed ${files.length} commands from ${user}/${repo}`);
      console.log(`  Repository: ${user}/${repo}@${revision.substring(0, 7)}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}