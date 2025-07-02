# Jumon

Claude Code custom slash commands package manager for easy sharing and management

## Installation

```bash
npm install -g jumon
```

## Usage

### Add a command from GitHub repository

```bash
# Add specific command
jumon add user/repo/commandName

# Add all commands from repository
jumon add user/repo

# Add with alias
jumon add user/repo/commandName --alias my-command

# Add to local project only
jumon add user/repo/commandName --local
```

### Install commands from jumon-lock.json

```bash
jumon install
```

### List installed commands

```bash
# List all commands
jumon list

# List local commands only
jumon list --local

# List global commands only
jumon list --global
```

### Remove a command

```bash
jumon remove commandName
```

## Files

- `jumon.json` - Configuration file (like package.json)
- `jumon-lock.json` - Lock file with exact versions (like package-lock.json)

## Command Installation Paths

- Global: `~/.claude/commands/jumon/user/repo/`
- Local: `.claude/commands/jumon/user/repo/`

Commands are accessible in Claude Code as `/project:commandName` or `/user:commandName`