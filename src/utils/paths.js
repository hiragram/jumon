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
  const basePath = isLocal ? process.cwd() : os.homedir();
  return path.join(basePath, 'jumon.json');
}

export function getJumonLockPath(isLocal = false) {
  const basePath = isLocal ? process.cwd() : os.homedir();
  return path.join(basePath, 'jumon-lock.json');
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