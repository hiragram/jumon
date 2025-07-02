#!/usr/bin/env node

import { Command } from 'commander';
import { addCommand } from '../src/commands/add.js';
import { installCommand } from '../src/commands/install.js';
import { listCommand } from '../src/commands/list.js';
import { removeCommand } from '../src/commands/remove.js';

const program = new Command();

program
  .name('jumon')
  .description('Claude Code custom slash commands package manager')
  .version('0.1.0');

program
  .command('add <repository>')
  .description('Add a command from GitHub repository (user/repo/command)')
  .option('-l, --local', 'Install to local project (.claude/commands/)')
  .option('-g, --global', 'Install to global commands (~/.claude/commands/)')
  .option('-a, --alias <name>', 'Install with a different name')
  .action(addCommand);

program
  .command('install')
  .description('Install all commands from jumon-lock.json')
  .option('-l, --local', 'Install to local project')
  .option('-g, --global', 'Install to global commands')
  .action(installCommand);

program
  .command('list')
  .description('List installed commands')
  .option('-l, --local', 'List local commands only')
  .option('-g, --global', 'List global commands only')
  .action(listCommand);

program
  .command('remove <command>')
  .description('Remove an installed command')
  .option('-l, --local', 'Remove from local project')
  .option('-g, --global', 'Remove from global commands')
  .action(removeCommand);

program.parse();