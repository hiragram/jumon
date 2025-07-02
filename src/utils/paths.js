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

export async function ensureCommandsDir(isLocal = false) {
  const commandsPath = getCommandsPath(isLocal);
  await fs.ensureDir(commandsPath);
  return commandsPath;
}