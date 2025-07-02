import path from 'path';
import os from 'os';
import fs from 'fs-extra';

export function getGlobalCommandsPath() {
  return path.join(os.homedir(), '.claude', 'commands', 'jumon');
}

export function getLocalCommandsPath() {
  return path.join(process.cwd(), '.claude', 'commands', 'jumon');
}

export function getCommandsPath(isLocal = false) {
  return isLocal ? getLocalCommandsPath() : getGlobalCommandsPath();
}

export function getJumonConfigPath(isLocal = false) {
  if (isLocal) {
    return path.join(process.cwd(), 'jumon.json');
  } else {
    return path.join(os.homedir(), '.jumon', 'jumon.json');
  }
}

export function getJumonLockPath(isLocal = false) {
  if (isLocal) {
    return path.join(process.cwd(), 'jumon-lock.json');
  } else {
    return path.join(os.homedir(), '.jumon', 'jumon-lock.json');
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

export async function ensureJumonConfigDir(isLocal = false) {
  if (!isLocal) {
    const jumonDir = path.join(os.homedir(), '.jumon');
    await fs.ensureDir(jumonDir);
  }
}