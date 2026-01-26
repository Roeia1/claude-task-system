# CLAUDE.md

Guidance for Claude Code when working with this repository.

## What Is This?

**SAGA** (Structured Autonomous Goal Achievement) - a Claude Code plugin for epic/story development workflows with autonomous execution. Users define epics, generate stories, and execute them via autonomous workers.

## Repository Structure

```
saga/
├── plugin/                  # Plugin source (skills, agents, hooks)
├── packages/cli/            # @saga-ai/cli npm package
├── .claude/skills/          # Dev skills for this repo (publish-plugin, publish-cli, pr-review)
└── CHANGELOG.md             # Plugin version history
```

## Key Documentation

| Doc | Purpose |
|-----|---------|
| [`README.md`](README.md) | User-facing: installation, workflow, skills reference |
| [`plugin/docs/ENVIRONMENT.md`](plugin/docs/ENVIRONMENT.md) | Environment variables reference |
| [`packages/cli/CLAUDE.md`](packages/cli/CLAUDE.md) | CLI package development guide |

## Plugin Skills

| Skill | Entry Point |
|-------|-------------|
| `/init` | [`plugin/skills/init/SKILL.md`](plugin/skills/init/SKILL.md) |
| `/create-epic` | [`plugin/skills/create-epic/SKILL.md`](plugin/skills/create-epic/SKILL.md) |
| `/generate-stories` | [`plugin/skills/generate-stories/SKILL.md`](plugin/skills/generate-stories/SKILL.md) |
| `/execute-story` | [`plugin/skills/execute-story/SKILL.md`](plugin/skills/execute-story/SKILL.md) |
| `/resolve-blocker` | [`plugin/skills/resolve-blocker/SKILL.md`](plugin/skills/resolve-blocker/SKILL.md) |

## Agents

| Agent | Location |
|-------|----------|
| `generate-story` | [`plugin/agents/generate-story.md`](plugin/agents/generate-story.md) |

## Quick Reference

### Path References

Always use `${SAGA_PLUGIN_ROOT}` for plugin-relative paths:

```markdown
${SAGA_PLUGIN_ROOT}/skills/create-epic/templates/epic-template.md
```

### Environment Variables

All SAGA variables use the `SAGA_` prefix. Read via Bash:

```bash
echo $SAGA_PROJECT_DIR
```

Core variables: `SAGA_PROJECT_DIR`, `SAGA_PLUGIN_ROOT`, `SAGA_TASK_CONTEXT`

See [`plugin/docs/ENVIRONMENT.md`](plugin/docs/ENVIRONMENT.md) for full reference.

### Git Commits

```bash
# Story-based commits
git commit -m "test(story-slug): add tests for [feature]"
git commit -m "feat(story-slug): implement [feature]"
git commit -m "fix(story-slug): resolve [issue]"
```

## Non-Negotiable Rules

1. **TDD** - Tests before implementation
2. **No Test Modification** - Tests locked after creation without user approval
3. **Journaling** - Document decisions in journal.md during execution
4. **Commit Discipline** - Commit and push at logical milestones
