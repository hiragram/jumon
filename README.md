# Jumon

Claude Code custom slash commands package manager for easy sharing and management of commands

## Installation

```bash
npm install -g jumon
```

## Usage

### Add a command from GitHub repository

```bash
# Add specific command (defaults to local)
jumon add user/repo/commandName

# Add all commands from repository
jumon add user/repo

# Add with alias
jumon add user/repo/commandName --alias my-command

# Add to global commands
jumon add user/repo/commandName --global
```

**Note**: Commands are installed locally by default. The `.claude` directory must exist in the target location.

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

- `jumon.json` - Configuration file listing desired commands (like package.json)
- `jumon-lock.json` - Lock file with exact repository revisions (like package-lock.json)

### Lock file structure

```json
{
  "lockfileVersion": 2,
  "repositories": {
    "user/repo": {
      "revision": "abc1234567890abcdef1234567890abcdef123456",
      "only": ["command1", "command2"]
    },
    "user/another-repo": {
      "revision": "def7890abcdef1234567890abcdef123456789abc",
      "only": []
    }
  }
}
```

- `revision`: Git commit hash for the repository
- `only`: Array of specific commands to install. Empty array means install all commands.

## Command Installation Paths

- **Local (default)**: `.claude/commands/jumon/user/repo/` - accessible as `/project:commandName`
- **Global**: `~/.claude/commands/jumon/user/repo/` - accessible as `/user:commandName`

**Requirements**: The `.claude` directory must exist in the target location before installing commands.