---
name: publish-plugin
description: "Releases new versions of the Claude Task System plugin. Bumps version numbers in CHANGELOG.md, README.md, plugin.json, and marketplace.json, then creates git tags and GitHub releases. Use when the user says 'release', 'new version', 'version bump', or 'publish release'."
allowed-tools: Read, Edit, Bash, Glob, Grep, TaskCreate, TaskUpdate, TaskList, TaskGet
---

# Releasing Versions

## Release Workflow

**IMPORTANT**: At the start, use the `TaskCreate` tool to create all tasks below. As you complete each task, use `TaskUpdate` to mark it `completed`.

### Tasks to Create

1. **Gather changes since last release**

   Run these commands:
   ```bash
   git log --oneline --grep="chore: release" | head -1
   # Note the HASH from output, then:
   git log HASH..HEAD --oneline
   ```

   Review all commits since the last release. Categorize changes as: Added, Changed, Fixed, Removed. This categorization will be used for the changelog and GitHub release notes.

2. **Determine version number with user**

   Ask user for version or suggest based on changes:
   - **MAJOR** (X.0.0): Breaking changes
   - **MINOR** (0.X.0): New features, backward-compatible
   - **PATCH** (0.0.X): Bug fixes, docs

   Current version: `grep '"version"' plugin/.claude-plugin/plugin.json`

3. **Update CHANGELOG.md**

   Add new version section at top of file:
   ```markdown
   ## [X.Y.Z] - YYYY-MM-DD

   ### Added
   - **feature**: Description

   ### Changed
   - **component**: Description

   ### Fixed
   - **component**: Description
   ```

4. **Update README.md version badge**

   Find and update the version badge:
   ```markdown
   [![Version](https://img.shields.io/badge/version-X.Y.Z-blue)](CHANGELOG.md)
   ```

5. **Update documentation content**

   Based on the commits gathered in task 1, read README.md and CLAUDE.md and update any content that is now outdated due to the changes. Look for:
   - Feature descriptions that changed
   - New skills or agents that need documenting
   - Removed or renamed functionality
   - Updated workflow instructions

6. **Update plugin/.claude-plugin/plugin.json**

   Update `"version": "X.Y.Z"` to the new version.

7. **Update .claude-plugin/marketplace.json**

   Update `"version": "X.Y.Z"` in the plugins array.

8. **Commit and push changes**

   ```bash
   git add CHANGELOG.md README.md CLAUDE.md plugin/.claude-plugin/plugin.json .claude-plugin/marketplace.json
   git commit -m "chore: release vX.Y.Z

   Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
   git push
   ```

9. **Create and push git tag**

   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

10. **Create GitHub release**

    ```bash
    gh release create vX.Y.Z --title "vX.Y.Z: Brief Title" --notes "$(cat <<'EOF'
    ## Added
    - Description

    ## Changed
    - Description

    ## Fixed
    - Description
    EOF
    )"
    ```

    Use the changelog content for the release notes.

11. **Verify release**

    1. Check release page: https://github.com/Roeia1/claude-task-system/releases
    2. Test install: `/plugin install claude-task-system@claude-task-system`

    Report success to user with link to the release.

## Quick Reference

```bash
# Current version
grep '"version"' plugin/.claude-plugin/plugin.json

# Recent releases
gh release list --limit 5

# Delete release (if needed)
gh release delete vX.Y.Z --yes && git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z
```
