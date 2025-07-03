# Cccsc

Claude Code custom slash commands package manager for easy sharing and management of commands

## Usage

No installation required! Use `npx` to run cccsc commands directly:

### Add a command from GitHub repository

```bash
# Add specific command (defaults to local)
npx cccsc add user/repo/commandName

# Add all commands from repository
npx cccsc add user/repo

# Add with alias
npx cccsc add user/repo/commandName --alias my-command

# Add to global commands
npx cccsc add user/repo/commandName --global

# Add from specific branch
npx cccsc add user/repo/commandName --branch develop
```

**Note**: Commands are installed locally by default. The `.claude` directory must exist in the target location.

### Install commands from cccsc-lock.json

```bash
npx cccsc install
```

### List installed commands

```bash
# List all commands
npx cccsc list

# List local commands only
npx cccsc list --local

# List global commands only
npx cccsc list --global
```

### Remove a command

```bash
npx cccsc remove commandName
```

### Update commands

```bash
# Update all commands based on cccsc.json constraints
# Shows diff preview and asks for confirmation
npx cccsc update

# Update global commands only
npx cccsc update --global
```

The update command will:
1. Check each repository for new commits based on branch constraints
2. Show a detailed diff of changes
3. Ask for confirmation before applying changes
4. Update the lock file with new revisions

## Files

### Local files (project-specific)
- `cccsc.json` - Configuration file listing desired repositories and commands
- `cccsc-lock.json` - Lock file with exact repository revisions

### Global files
- `~/.cccsc/cccsc.json` - Global configuration file
- `~/.cccsc/cccsc-lock.json` - Global lock file

### Configuration file structure (cccsc.json)

```json
{
  "repositories": {
    "user/repo": {
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
      "branch": "develop",
      "only": []
    }
  }
}
```

- `only`: Array of specific commands. Empty array means install all commands from repository.
- `branch`: Specific branch to use (defaults to "main" if not specified)

### Lock file structure (cccsc-lock.json)

```json
{
  "lockfileVersion": 2,
  "repositories": {
    "user/repo": {
      "revision": "abc1234567890abcdef1234567890abcdef123456",
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
      "revision": "def7890abcdef1234567890abcdef123456789abc",
      "only": []
    }
  }
}
```

- `revision`: Git commit hash for the repository
- `only`: Array of specific commands to install. Empty array means install all commands.

## Command Installation Paths

- **Local (default)**: `.claude/commands/cccsc/user/repo/` - accessible as `/project:commandName`
- **Global**: `~/.claude/commands/cccsc/user/repo/` - accessible as `/user:commandName`

**Requirements**: The `.claude` directory must exist in the target location before installing commands.