---
name: release
description: "Releases new versions of the Claude Task System plugin. Bumps version numbers in CHANGELOG.md, README.md, plugin.json, and marketplace.json, then creates git tags and GitHub releases. Use when the user says 'release', 'new version', 'version bump', or 'publish release'."
allowed-tools: Read, Edit, Bash, Glob, Grep
---

# Releasing Versions

## Release Workflow

Copy this checklist and track progress:

```
Release Progress:
- [ ] Step 1: Gather changes since last release
- [ ] Step 2: Determine version number with user
- [ ] Step 3: Update CHANGELOG.md
- [ ] Step 4: Update README.md version badge
- [ ] Step 5: Update documentation content (README.md, CLAUDE.md)
- [ ] Step 6: Update plugin/.claude-plugin/plugin.json
- [ ] Step 7: Update .claude-plugin/marketplace.json
- [ ] Step 8: Commit and push changes
- [ ] Step 9: Create and push git tag
- [ ] Step 10: Create GitHub release
- [ ] Step 11: Verify release
```

### Step 1: Gather Changes

```bash
# Find last release commit
git log --oneline --grep="chore: release" | head -1

# List commits since then (replace HASH)
git log HASH..HEAD --oneline
```

Categorize as: Added, Changed, Fixed, Removed.

### Step 2: Determine Version

Ask user for version, or suggest based on changes:
- **MAJOR** (X.0.0): Breaking changes
- **MINOR** (0.X.0): New features, backward-compatible
- **PATCH** (0.0.X): Bug fixes, docs

### Step 3: Update CHANGELOG.md

Add at top:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- **feature**: Description

### Changed
- **component**: Description

### Fixed
- **component**: Description
```

### Step 4: Update README.md Badge

Find and update:

```markdown
[![Version](https://img.shields.io/badge/version-X.Y.Z-blue)](CHANGELOG.md)
```

### Step 5: Update Documentation Content

Based on the commits gathered in Step 1, read README.md and CLAUDE.md and update any content that is now outdated.

### Step 6: Update plugin/.claude-plugin/plugin.json

Update `"version": "X.Y.Z"`

### Step 7: Update .claude-plugin/marketplace.json

Update `"version": "X.Y.Z"` in the plugins array.

### Step 8: Commit and Push

```bash
git add CHANGELOG.md README.md plugin/.claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore: release vX.Y.Z"
git push
```

### Step 9: Create Git Tag

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

### Step 10: Create GitHub Release

```bash
gh release create vX.Y.Z --title "vX.Y.Z: Title" --notes "$(cat <<'EOF'
## Added
- Description

## Changed
- Description

## Fixed
- Description
EOF
)"
```

Use the changelog content for release notes.

### Step 11: Verify

1. Check release: https://github.com/Roeia1/claude-task-system/releases
2. Test install: `/plugin install claude-task-system@claude-task-system`

## Quick Reference

```bash
# Current version
grep '"version"' plugin/.claude-plugin/plugin.json

# Recent releases
gh release list --limit 5

# Delete release (if needed)
gh release delete vX.Y.Z --yes && git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z
```
