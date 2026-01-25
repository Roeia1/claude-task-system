# Releasing a New Version

This document describes the process for releasing a new version of the SAGA plugin.

## Overview

Publishing a new version involves updating version numbers across multiple files, creating a git tag, and creating a GitHub Release. There is no npm or other package registry—users install directly from GitHub via the Claude Code plugin system.

## Pre-Release Checklist

Before releasing, ensure:

- [ ] All features/fixes for this release are merged to `master`
- [ ] All tests pass
- [ ] CHANGELOG.md is updated with all changes since the previous version
- [ ] README.md is reviewed and updated if needed (new features, changed behavior, removed functionality)

### Finding Changes Since Last Release

To see what changed since the last version bump:

```bash
# Find the commit that bumped to current version
git log --oneline --grep="chore: release" | head -1

# Or find by version number
git log --oneline --grep="1.2.0" | head -1

# List commits since that point
git log <commit-hash>..HEAD --oneline
```

Review each commit and categorize changes as Added, Changed, Fixed, or Removed for the changelog.

## Files to Update

| File | Field | Example |
|------|-------|---------|
| `CHANGELOG.md` | New version section at top | `## [1.2.0] - 2025-12-22` |
| `README.md` | Version badge | `version-1.2.0-blue` |
| `plugin/.claude-plugin/plugin.json` | `"version"` | `"1.2.0"` |
| `.claude-plugin/marketplace.json` | `"version"` | `"1.2.0"` |

## Release Process

### 1. Update CHANGELOG.md

Add a new section at the top with the version and date:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- **feature-name**: Description of new feature

### Changed
- **component**: Description of change

### Fixed
- **component**: Description of fix
```

### 2. Review and Update README.md

**Version badge**: Update to new version:

```markdown
[![Version](https://img.shields.io/badge/version-X.Y.Z-blue)](CHANGELOG.md)
```

**Content review**: Check if any changes in this release require README updates:
- New features or skills added → Document in appropriate section
- Changed behavior → Update affected descriptions
- Removed functionality → Remove obsolete documentation
- New commands or workflows → Add usage examples

### 3. Update Plugin Schema

Edit `plugin/.claude-plugin/plugin.json`:

```json
{
  "version": "X.Y.Z",
  ...
}
```

### 4. Update Marketplace Schema

Edit `.claude-plugin/marketplace.json`:

```json
{
  "plugins": [
    {
      "version": "X.Y.Z",
      ...
    }
  ]
}
```

### 5. Commit and Push

```bash
git add CHANGELOG.md README.md plugin/.claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore: release vX.Y.Z"
git push
```

### 6. Create Git Tag

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

### 7. Create GitHub Release

```bash
gh release create vX.Y.Z --title "vX.Y.Z: Release Title" --notes "$(cat <<'EOF'
## Added
- Feature description

## Changed
- Change description

## Fixed
- Fix description
EOF
)"
```

Or use the GitHub web UI: **Releases** → **Draft a new release** → Select tag → Add title and notes.

## Version Numbering

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes to plugin behavior or skill interfaces
- **MINOR** (0.X.0): New features, new skills, backward-compatible enhancements
- **PATCH** (0.0.X): Bug fixes, documentation updates, minor improvements

## Quick Reference Commands

```bash
# View current version
grep '"version"' plugin/.claude-plugin/plugin.json

# List recent releases
gh release list --limit 5

# View a specific release
gh release view vX.Y.Z

# Delete a release (if needed to recreate)
gh release delete vX.Y.Z --yes
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
```

## Post-Release

After releasing:

1. Verify the release appears on GitHub: https://github.com/Roeia1/saga/releases
2. Test installation:
   ```bash
   /plugin install saga@core
   ```
3. Announce the release if significant changes were made
