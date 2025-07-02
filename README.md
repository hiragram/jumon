# Jumon

Claude Code custom slash commands package manager for easy sharing and management of commands

## Usage

No installation required! Use `npx` to run jumon commands directly:

### Add a command from GitHub repository

```bash
# Add specific command (defaults to local)
npx jumon add user/repo/commandName

# Add all commands from repository
npx jumon add user/repo

# Add with alias
npx jumon add user/repo/commandName --alias my-command

# Add to global commands
npx jumon add user/repo/commandName --global
```

**Note**: Commands are installed locally by default. The `.claude` directory must exist in the target location.

### Install commands from jumon-lock.json

```bash
npx jumon install
```

### List installed commands

```bash
# List all commands
npx jumon list

# List local commands only
npx jumon list --local

# List global commands only
npx jumon list --global
```

### Remove a command

```bash
npx jumon remove commandName
```

### Update commands

```bash
# Update all commands based on jumon.json constraints
# Shows diff preview and asks for confirmation
npx jumon update

# Update global commands only
npx jumon update --global
```

The update command will:
1. Check each repository for new commits based on version/branch/tag constraints
2. Show a detailed diff of changes
3. Ask for confirmation before applying changes
4. Update the lock file with new revisions

## Files

### Local files (project-specific)
- `jumon.json` - Configuration file listing desired repositories and commands
- `jumon-lock.json` - Lock file with exact repository revisions

### Global files
- `~/.jumon/jumon.json` - Global configuration file
- `~/.jumon/jumon-lock.json` - Global lock file

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
  "lockfileVersion": 1,
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