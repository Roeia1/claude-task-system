---
name: publish-cli
description: "Publishes a new version of the @saga-ai/cli npm package. Bumps version in package.json, updates CHANGELOG.md, builds, tests, and publishes to npm. Use when the user says 'publish cli', 'release cli', 'npm publish', or 'publish @saga-ai/cli'."
user-invocable: true
allowed-tools: Read, Edit, Bash, Glob, Grep, TaskCreate, TaskUpdate, TaskList, TaskGet, AskUserQuestion
---

# Publishing @saga-ai/cli

This skill publishes the `@saga-ai/cli` npm package located at `packages/cli/`.

## Tasks

| Subject | Description | Active Form | Blocked By | Blocks |
|---------|-------------|-------------|------------|--------|
| Check prerequisites | Run these commands: `pnpm --version`, `npm whoami`, `git status --porcelain`, `grep '"version"' packages/cli/package.json`. Validation: (1) `pnpm --version` must succeed and return a version - if it fails, guide user to run `npm install -g pnpm` and stop. (2) `npm whoami` must succeed and return a username - if it fails, guide user to run `npm login` and stop. (3) `git status --porcelain` must return empty (no output) - if git is dirty, ask user to commit or stash changes first and stop. (4) Note the current version from package.json for reference in later tasks. | Checking prerequisites | - | Gather changes |
| Gather changes | Run: `git log --oneline --all -- packages/cli/ \| head -20` and `git tag -l "cli-v*" \| tail -5`. Review commits to `packages/cli/` since the last CLI tag. Categorize changes as: Added (new features/commands), Changed (modified behavior), Fixed (bug fixes), Removed (deprecated/removed). This categorization will be used for the changelog entry. | Gathering changes | Check prerequisites | Determine version |
| Determine version | Use AskUserQuestion to ask user for version bump type. Present current version and suggest based on changes: MAJOR (X.0.0) for breaking CLI changes or removed commands, MINOR (0.X.0) for new commands, new options, or backward-compatible changes, PATCH (0.0.X) for bug fixes, docs, or internal improvements. Calculate and confirm the new version number with user. | Determining version | Gather changes | Update package.json |
| Update package.json | Edit `packages/cli/package.json` to update the `"version"` field to the new version number. The field should look like: `"version": "X.Y.Z"` where X.Y.Z is the version determined in previous task. | Updating package.json | Determine version | Update CHANGELOG |
| Update CHANGELOG | Edit `packages/cli/CHANGELOG.md` to add new version section at top of file (after header). Format: `## [X.Y.Z] - YYYY-MM-DD` followed by sections for each change category. Use `### Added` for new features with format `- **command**: Description`. Use `### Changed` for modified behavior. Use `### Fixed` for bug fixes. Use `### Removed` for removed features. Only include sections that have changes. If CHANGELOG.md doesn't exist, create it with header: `# Changelog` followed by blank line, then `All notable changes to the \`@saga-ai/cli\` package will be documented in this file.` followed by blank line, then `The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),` and `and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).` | Updating CHANGELOG | Update package.json | Update README |
| Update README | Review `packages/cli/README.md` and update if needed. Check for: (1) New commands that need documenting, (2) Changed command options, (3) Usage examples needing updates, (4) Version badges needing updates. Look for sections: Installation instructions, Command reference, Usage examples. If no updates needed, skip editing but still mark complete. | Updating README | Update CHANGELOG | Commit changes |
| Commit changes | Run: `git add packages/cli/package.json packages/cli/CHANGELOG.md packages/cli/README.md` then commit with message format: `chore(cli): release @saga-ai/cli vX.Y.Z` followed by blank line and `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`. Then run `git push` to push to remote. | Committing changes | Update README | Publish to npm |
| Publish to npm | Run: `cd packages/cli && pnpm run publish:npm`. This script executes: `pnpm build && pnpm test && pnpm publish --access public`. If tests fail, the publish will not proceed - fix issues and retry. Wait for successful completion before proceeding. | Publishing to npm | Commit changes | Create git tag |
| Create git tag | Run: `git tag "cli-vX.Y.Z"` then `git push origin "cli-vX.Y.Z"`. Note: CLI uses `cli-vX.Y.Z` tag format (with `cli-` prefix) to distinguish from plugin releases which use `vX.Y.Z` format. | Creating git tag | Publish to npm | Verify publication |
| Verify publication | Run: `npm view @saga-ai/cli version` and `npx @saga-ai/cli@X.Y.Z --version` to confirm the new version is live. Report success to user with: (1) Published version number, (2) npm package URL: https://www.npmjs.com/package/@saga-ai/cli, (3) Installation command: `npx @saga-ai/cli@latest <command>`. | Verifying publication | Create git tag | - |

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
