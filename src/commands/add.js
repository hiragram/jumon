import path from 'path';
import fs from 'fs-extra';
import { parseRepositoryPath, getFileContent, findMarkdownFiles } from '../utils/github.js';
import { ensureCommandsDir } from '../utils/paths.js';
import { addCommandToConfig, addCommandToLock } from '../utils/config.js';

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

export async function addCommand(repository, options) {
  try {
    const isLocal = !options.global;
    const { user, repo, commandPath } = parseRepositoryPath(repository);
    
    console.log(`Adding command from ${user}/${repo}${commandPath ? `/${commandPath}` : ''}...`);
    
    if (commandPath) {
      const filePath = commandPath.endsWith('.md') ? commandPath : `${commandPath}.md`;
      const commandName = options.alias || path.basename(commandPath);
      
      const commandsDir = await ensureCommandsDir(isLocal);
      const targetDir = path.join(commandsDir, user, repo);
      await fs.ensureDir(targetDir);
      
      const conflictPath = await checkCommandConflict(commandName, commandsDir);
      if (conflictPath && !options.alias) {
        console.error(`Error: Command '${commandName}' already exists at ${conflictPath}`);
        console.error(`Use --alias flag to install with a different name:`);
        console.error(`  jumon add ${repository} --alias <new-name>`);
        process.exit(1);
      }
      
      try {
        const content = await getFileContent(user, repo, filePath);
        const targetFile = path.join(targetDir, `${commandName}.md`);
        await fs.writeFile(targetFile, content);
        
        await addCommandToConfig(repository, options.alias, isLocal);
        await addCommandToLock(repository, commandName, user, repo, filePath, isLocal);
        
        console.log(`✓ Successfully installed command '${commandName}' to ${targetFile}`);
      } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    } else {
      const files = await findMarkdownFiles(user, repo);
      
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
      
      for (const file of files) {
        try {
          const content = await getFileContent(user, repo, file.path);
          const targetFile = path.join(targetDir, file.name + '.md');
          await fs.writeFile(targetFile, content);
          
          await addCommandToLock(`${user}/${repo}/${file.path}`, file.name, user, repo, file.path, isLocal);
          console.log(`✓ Installed ${file.name}`);
        } catch (error) {
          console.error(`✗ Failed to install ${file.name}: ${error.message}`);
        }
      }
      
      await addCommandToConfig(repository, null, isLocal);
      console.log(`✓ Successfully installed ${files.length} commands from ${user}/${repo}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}