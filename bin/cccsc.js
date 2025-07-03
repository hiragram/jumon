#!/usr/bin/env node

import { Command } from 'commander';
import { addCommand } from '../src/commands/add.js';
import { installCommand } from '../src/commands/install.js';
import { listCommand } from '../src/commands/list.js';
import { removeCommand } from '../src/commands/remove.js';
import { updateCommand } from '../src/commands/update.js';

const program = new Command();

program
  .name('cccsc')
  .description('Claude Code custom slash commands package manager')
  .version('0.1.0');

program
  .command('add <repository>')
  .description('Add a command from GitHub repository (user/repo/command) - defaults to local')
  .option('-g, --global', 'Install to global commands (~/.claude/commands/)')
  .option('-l, --local', 'Install to local project (.claude/commands/) [default]')
  .option('-a, --alias <name>', 'Install with a different name')
  .option('-b, --branch <branch>', 'Specific branch to use')
  .action(addCommand);

program
  .command('install')
  .description('Install all commands from cccsc-lock.json - defaults to local')
  .option('-g, --global', 'Install to global commands')
  .option('-l, --local', 'Install to local project [default]')
  .action(installCommand);

program
  .command('list')
  .description('List installed commands')
  .option('-l, --local', 'List local commands only')
  .option('-g, --global', 'List global commands only')
  .action(listCommand);

program
  .command('remove <command>')
  .description('Remove an installed command - defaults to local')
  .option('-g, --global', 'Remove from global commands')
  .option('-l, --local', 'Remove from local project [default]')
  .action(removeCommand);

program
  .command('update')
  .description('Update commands to latest versions based on cccsc.json constraints')
  .option('-g, --global', 'Update global commands')
  .option('-l, --local', 'Update local commands [default]')
  .action(updateCommand);

program.parse();