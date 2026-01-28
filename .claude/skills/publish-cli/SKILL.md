---
name: publish-cli
description: "Publishes a new version of the @saga-ai/cli npm package. Bumps version in package.json, updates CHANGELOG.md, builds, tests, and publishes to npm. Use when the user says 'publish cli', 'release cli', 'npm publish', or 'publish @saga-ai/cli'."
user-invocable: true
allowed-tools: Read, Edit, Bash, Glob, Grep, TaskCreate, TaskUpdate, TaskList, TaskGet
---

# Publishing @saga-ai/cli

This skill publishes the `@saga-ai/cli` npm package located at `packages/cli/`.

## Prerequisites

- npm authentication configured (`npm login` or `NPM_TOKEN` environment variable)
- pnpm installed (`npm install -g pnpm`)
- All changes committed (clean git status)

## Publish Workflow

**IMPORTANT**: At the start, use the `TaskCreate` tool to create all tasks below. As you complete each task, use `TaskUpdate` to mark it `completed`.

### Tasks to Create

1. **Verify clean git status and npm auth**

   Run these commands:
   ```bash
   git status --porcelain
   npm whoami
   grep '"version"' packages/cli/package.json
   ```
   - `git status --porcelain` must return empty (no output). If git is dirty, ask user to commit or stash changes first.
   - `npm whoami` must succeed and return a username. If it fails, guide user to run `npm login`.
   - Note the current version from package.json for reference.

2. **Gather changes since last release**

   Run these commands:
   ```bash
   git log --oneline --all -- packages/cli/ | head -20
   git tag -l "cli-v*" | tail -5
   ```
   Review commits to `packages/cli/` since the last CLI tag. Categorize changes as: Added, Changed, Fixed, Removed. This categorization will be used for the changelog.

3. **Determine version number with user**

   Ask user for version or suggest based on changes:
   - **MAJOR** (X.0.0): Breaking CLI changes, removed commands
   - **MINOR** (0.X.0): New commands, new options, backward-compatible changes
   - **PATCH** (0.0.X): Bug fixes, docs, internal improvements

   Current version is in `packages/cli/package.json`.

4. **Update packages/cli/package.json version**

   Update the `"version"` field to the new version number:
   ```json
   {
     "name": "@saga-ai/cli",
     "version": "X.Y.Z",
     ...
   }
   ```

5. **Update packages/cli/CHANGELOG.md**

   Add new version section at top of file:
   ```markdown
   ## [X.Y.Z] - YYYY-MM-DD

   ### Added
   - **command**: Description of new command or feature

   ### Changed
   - **command**: Description of changed behavior

   ### Fixed
   - **command**: Description of bug fix
   ```

   If creating the file for the first time, use this template:
   ```markdown
   # Changelog

   All notable changes to the `@saga-ai/cli` package will be documented in this file.

   The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
   and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

   ## [X.Y.Z] - YYYY-MM-DD

   ### Added
   - Initial release
   - `saga init` - Initialize .saga/ directory structure
   - `saga implement` - Orchestrate autonomous story execution
   - `saga dashboard` - Start HTTP server for dashboard UI
   - `saga help` - Display help information
   ```

6. **Update packages/cli/README.md if needed**

   Review `packages/cli/README.md` and update if any of the following apply:
   - New commands were added
   - Command options changed
   - Usage examples need updating
   - Version badge needs updating (if present)

   Look for sections like: Installation instructions, Command reference, Usage examples.

7. **Commit changes**

   ```bash
   git add packages/cli/package.json packages/cli/CHANGELOG.md packages/cli/README.md
   git commit -m "chore(cli): release @saga-ai/cli vX.Y.Z

   Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
   git push
   ```

8. **Build, test, and publish to npm**

   ```bash
   cd packages/cli && pnpm run publish:npm
   ```

   The `publish:npm` script runs: `pnpm build && pnpm test && pnpm publish --access public`

   If tests fail, the publish will not proceed. Fix the issues and retry.

9. **Create git tag**

   ```bash
   git tag "cli-vX.Y.Z"
   git push origin "cli-vX.Y.Z"
   ```

   Note: CLI uses `cli-vX.Y.Z` tag format to distinguish from plugin releases (`vX.Y.Z`).

10. **Verify publication**

    ```bash
    npm view @saga-ai/cli version
    npx @saga-ai/cli@X.Y.Z --version
    ```

    Report success to user with:
    - Published version
    - npm package URL: https://www.npmjs.com/package/@saga-ai/cli
    - Installation command: `npx @saga-ai/cli@latest <command>`

## Quick Reference

```bash
# Current version
grep '"version"' packages/cli/package.json

# Recent CLI commits
git log --oneline -10 -- packages/cli/

# CLI tags
git tag -l "cli-v*"

# npm package info
npm view @saga-ai/cli

# Unpublish (within 72 hours, use with caution)
npm unpublish @saga-ai/cli@X.Y.Z
```

## Troubleshooting

### npm ERR! 403 Forbidden
- Check `npm whoami` - you may need to `npm login`
- Verify you have publish rights to @saga-ai scope

### Tests Failing
- Run `pnpm test` manually to see detailed output
- Fix issues before publishing

### Version Already Exists
- npm doesn't allow republishing the same version
- Bump to next patch version (e.g., 0.1.1 -> 0.1.2)
