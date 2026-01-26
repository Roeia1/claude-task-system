---
name: publish-cli
description: "Publishes a new version of the @saga-ai/cli npm package. Bumps version in package.json, updates CHANGELOG.md, builds, tests, and publishes to npm. Use when the user says 'publish cli', 'release cli', 'npm publish', or 'publish @saga-ai/cli'."
user-invocable: true
allowed-tools: Read, Edit, Bash, Glob, Grep
---

# Publishing @saga-ai/cli

This skill publishes the `@saga-ai/cli` npm package located at `packages/cli/`.

## Prerequisites

- npm authentication configured (`npm login` or `NPM_TOKEN` environment variable)
- pnpm installed (`npm install -g pnpm`)
- All changes committed (clean git status)

## Publish Workflow

Copy this checklist and track progress:

```
Publish Progress:
- [ ] Step 1: Verify clean git status and npm auth
- [ ] Step 2: Gather changes since last release
- [ ] Step 3: Determine version number with user
- [ ] Step 4: Update packages/cli/package.json version
- [ ] Step 5: Update packages/cli/CHANGELOG.md
- [ ] Step 6: Update packages/cli/README.md if needed
- [ ] Step 7: Run build and tests
- [ ] Step 8: Commit changes
- [ ] Step 9: Publish to npm
- [ ] Step 10: Create git tag
- [ ] Step 11: Verify publication
```

### Step 1: Verify Prerequisites

```bash
# Check git status is clean
git status --porcelain

# Check npm auth
npm whoami

# Check current CLI version
grep '"version"' packages/cli/package.json
```

If git status is not clean, ask user to commit or stash changes first.
If npm auth fails, guide user to run `npm login`.

### Step 2: Gather Changes

```bash
# Find last CLI release commit
git log --oneline --all -- packages/cli/ | head -20

# Check if there's a previous CLI tag
git tag -l "cli-v*" | tail -5
```

Review commits to `packages/cli/` since last release. Categorize as: Added, Changed, Fixed, Removed.

### Step 3: Determine Version

Ask user for version, or suggest based on changes:
- **MAJOR** (X.0.0): Breaking CLI changes, removed commands
- **MINOR** (0.X.0): New commands, new options, backward-compatible changes
- **PATCH** (0.0.X): Bug fixes, docs, internal improvements

Current version can be found in `packages/cli/package.json`.

### Step 4: Update package.json Version

Update the `"version"` field in `packages/cli/package.json`:

```json
{
  "name": "@saga-ai/cli",
  "version": "X.Y.Z",
  ...
}
```

### Step 5: Update CHANGELOG.md

Update `packages/cli/CHANGELOG.md` (create if it doesn't exist).

Add at top:

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

### Step 6: Update README.md if Needed

Review `packages/cli/README.md` and update if any of the following apply:
- New commands were added
- Command options changed
- Usage examples need updating
- Version badge needs updating (if present)

Look for sections like:
- Installation instructions
- Command reference
- Usage examples

### Step 7: Build and Test

```bash
cd packages/cli

# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test
```

If tests fail, stop and report the failure. Do not proceed until all tests pass.

### Step 8: Commit Changes

```bash
# Stage version files
git add packages/cli/package.json packages/cli/CHANGELOG.md packages/cli/README.md

# Commit
git commit -m "chore(cli): release @saga-ai/cli vX.Y.Z

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

# Push
git push
```

### Step 9: Publish to npm

```bash
cd packages/cli

# Publish (already built in step 6)
pnpm publish --access public --no-git-checks
```

The `--no-git-checks` flag is used because we've already committed.

### Step 10: Create Git Tag

```bash
# Create CLI-specific tag
git tag "cli-vX.Y.Z"
git push origin "cli-vX.Y.Z"
```

Note: CLI uses `cli-vX.Y.Z` tag format to distinguish from plugin releases (`vX.Y.Z`).

### Step 11: Verify Publication

```bash
# Check npm registry
npm view @saga-ai/cli version

# Test installation
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
