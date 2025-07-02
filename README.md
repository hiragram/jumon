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

### Update commands

```bash
# Update all commands based on jumon.json constraints
jumon update

# Update global commands only
jumon update --global
```

## Files

- `jumon.json` - Configuration file listing desired repositories and commands
- `jumon-lock.json` - Lock file with exact repository revisions

### Configuration file structure (jumon.json)

```json
{
  "repositories": {
    "user/repo": {
      "version": "~> 1.2.0",
      "only": [
        {
          "name": "optimize",
          "path": "optimize.md",
          "alias": null
        },
        {
          "name": "my-component",
          "path": "frontend/component.md", 
          "alias": "my-component"
        }
      ]
    },
    "user/another-repo": {
      "branch": "main",
      "only": []
    },
    "user/tagged-repo": {
      "tag": "v2.1.0",
      "only": []
    }
  }
}
```

- `only`: Array of specific commands. Empty array means install all commands from repository.
- `version`: Version constraint (e.g., "1.2.0", "~> 1.2.0", ">= 1.0.0")
- `branch`: Specific branch to use (defaults to "main" if no version/tag specified)
- `tag`: Specific tag to use (alternative to version/branch)

**Note**: Only one of version/branch/tag should be specified. If none are provided, defaults to "main" branch.

### Lock file structure (jumon-lock.json)

```json
{
  "lockfileVersion": 2,
  "repositories": {
    "user/repo": {
      "revision": "abc1234567890abcdef1234567890abcdef123456",
      "only": ["optimize", "my-component"]
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