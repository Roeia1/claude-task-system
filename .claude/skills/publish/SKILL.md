---
name: publish
description: "Releases a new version of SAGA (plugin + CLI). Bumps version numbers, updates CHANGELOG.md, publishes CLI to npm, and creates GitHub release. Use when the user says 'release', 'publish', 'new version', or 'version bump'."
user-invocable: true
allowed-tools: Read, Edit, Bash, Glob, Grep, TaskCreate, TaskUpdate, TaskList, TaskGet, AskUserQuestion
---

# Publishing SAGA

This skill releases new versions of SAGA, which includes both the Claude Code plugin and the @saga-ai/cli npm package. They share the same version number and changelog.

## Tasks

| Subject | Description | Active Form | Blocked By | Blocks |
|---------|-------------|-------------|------------|--------|
| Gather changes | First run `git status --porcelain` to check for uncommitted changes. If there are uncommitted changes, ask the user to commit them first so they appear in the changelog - stop and wait for user to commit. Once clean, run: `git log --oneline --grep="chore: release" \| head -1` to find the last release commit hash. Note the HASH from output, then run: `git log HASH..HEAD --oneline` to see all commits since that release. Also run `grep '"version"' plugin/.claude-plugin/plugin.json` to get current version. Review all commits and categorize changes as: Added (new features/skills/agents/commands), Changed (modified behavior), Fixed (bug fixes), Removed (deprecated/removed). Note which changes are plugin-related and which are CLI-related. This categorization will be used for the changelog and GitHub release notes. | Gathering changes | - | Determine version |
| Determine version | Use AskUserQuestion to ask user for version bump type. Present current version and suggest based on changes: MAJOR (X.0.0) for breaking changes or removed skills/commands, MINOR (0.X.0) for new features, new skills/agents/commands, or backward-compatible changes, PATCH (0.0.X) for bug fixes, docs, or internal improvements. Calculate and confirm the new version number with user. | Determining version | Gather changes | Update CHANGELOG |
| Update CHANGELOG | Edit `CHANGELOG.md` to add new version section at top of file (after header). Format: `## [X.Y.Z] - YYYY-MM-DD` followed by sections for each change category. Use `### Added` for new features with format `- **feature**: Description`. Use `### Changed` for modified behavior. Use `### Fixed` for bug fixes. Use `### Removed` for removed features. Include both plugin and CLI changes - group them logically by feature area rather than by package. Only include sections that have changes. | Updating CHANGELOG | Determine version | Update README badge |
| Update README badge | Edit `README.md` to update the version badge. Find and update: `[![Version](https://img.shields.io/badge/version-X.Y.Z-blue)](CHANGELOG.md)` replacing X.Y.Z with the new version number. | Updating README badge | Update CHANGELOG | Update documentation |
| Update documentation | Based on the commits gathered earlier, read `README.md` and `CLAUDE.md` and update any content that is now outdated due to the changes. Look for: (1) Feature descriptions that changed, (2) New skills, agents, or CLI commands that need documenting, (3) Removed or renamed functionality, (4) Updated workflow instructions. If no documentation updates are needed, skip editing but still mark complete. | Updating documentation | Update README badge | Update plugin.json |
| Update plugin.json | Edit `plugin/.claude-plugin/plugin.json` to update the `"version"` field to the new version number. The field should look like: `"version": "X.Y.Z"` where X.Y.Z is the version determined earlier. | Updating plugin.json | Update documentation | Update marketplace.json |
| Update marketplace.json | Edit `.claude-plugin/marketplace.json` to update the `"version"` field in the plugins array to the new version number X.Y.Z. | Updating marketplace.json | Update plugin.json | Update CLI package.json |
| Update CLI package.json | Edit `packages/cli/package.json` to update the `"version"` field to the new version number X.Y.Z. The CLI version must match the plugin version. | Updating CLI package.json | Update marketplace.json | Commit changes |
| Commit changes | Run: `git add CHANGELOG.md README.md CLAUDE.md plugin/.claude-plugin/plugin.json .claude-plugin/marketplace.json packages/cli/package.json` then commit with message format: `chore: release vX.Y.Z` followed by blank line and `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`. Then run `git push` to push to remote. | Committing changes | Update CLI package.json | Publish CLI to npm |
| Publish CLI to npm | Run: `cd packages/cli && pnpm run publish:npm`. This script executes: `pnpm build:all && pnpm test && pnpm publish --access public`. If tests fail, the publish will not proceed - fix issues and retry. Wait for successful completion before proceeding. | Publishing CLI to npm | Commit changes | Create git tag |
| Create git tag | Run: `git tag vX.Y.Z` then `git push origin vX.Y.Z`. | Creating git tag | Publish CLI to npm | Create GitHub release |
| Create GitHub release | Run: `gh release create vX.Y.Z --title "vX.Y.Z: Brief Title" --notes "$(cat <<'EOF'` followed by the changelog content for this version (## Added, ## Changed, ## Fixed, ## Removed sections as applicable), then `EOF` and `)`. Use the categorized changes from the changelog for the release notes. Replace "Brief Title" with a short summary of the main change. | Creating GitHub release | Create git tag | Verify release |
| Verify release | Run `gh release view vX.Y.Z` and `npm view @saga-ai/cli version` to confirm both releases were created. Report success to user with: (1) Released version number, (2) Link to the GitHub release page: https://github.com/Roeia1/SAGA/releases, (3) npm package URL: https://www.npmjs.com/package/@saga-ai/cli, (4) Installation commands: `/plugin install Roeia1/SAGA` (plugin) and `npx @saga-ai/cli@latest <command>` (CLI). | Verifying release | Create GitHub release | - |

## Quick Reference

```bash
# Current version
grep '"version"' plugin/.claude-plugin/plugin.json

# Recent releases
gh release list --limit 5

# npm package info
npm view @saga-ai/cli

# Delete release (if needed)
gh release delete vX.Y.Z --yes && git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z
```

## Troubleshooting

### npm ERR! 403 Forbidden
- Check `npm whoami` - you may need to `npm login`
- Verify you have publish rights to @saga-ai scope

### Tests Failing
- Run `cd packages/cli && pnpm test` manually to see detailed output
- Fix issues before publishing

### Version Already Exists
- npm doesn't allow republishing the same version
- Bump to next patch version (e.g., 2.11.0 -> 2.11.1)
