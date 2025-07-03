import path from 'path';
import os from 'os';
import fs from 'fs-extra';

export function getGlobalCommandsPath() {
  return path.join(os.homedir(), '.claude', 'commands', 'cccsc');
}

export function getLocalCommandsPath() {
  return path.join(process.cwd(), '.claude', 'commands', 'cccsc');
}

export function getCommandsPath(isLocal = false) {
  return isLocal ? getLocalCommandsPath() : getGlobalCommandsPath();
}

export function getCccscConfigPath(isLocal = false) {
  if (isLocal) {
    return path.join(process.cwd(), 'cccsc.json');
  } else {
    return path.join(os.homedir(), '.cccsc', 'cccsc.json');
  }
}

export function getCccscLockPath(isLocal = false) {
  if (isLocal) {
    return path.join(process.cwd(), 'cccsc-lock.json');
  } else {
    return path.join(os.homedir(), '.cccsc', 'cccsc-lock.json');
  }
}

export async function checkClaudeDir(isLocal = false) {
  const basePath = isLocal ? process.cwd() : os.homedir();
  const claudeDir = path.join(basePath, '.claude');
  
  if (!(await fs.pathExists(claudeDir))) {
    const location = isLocal ? 'current directory' : 'home directory';
    throw new Error(`Claude Code directory not found in ${location}. Please ensure .claude directory exists.`);
  }
  
  return claudeDir;
}

export async function ensureCommandsDir(isLocal = false) {
  await checkClaudeDir(isLocal);
  const commandsPath = getCommandsPath(isLocal);
  await fs.ensureDir(commandsPath);
  return commandsPath;
}

export async function ensureCccscConfigDir(isLocal = false) {
  if (!isLocal) {
    const cccscDir = path.join(os.homedir(), '.cccsc');
    await fs.ensureDir(cccscDir);
  }
}