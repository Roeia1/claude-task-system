"""
Test suite for execute-story/scripts/implement.py - the story orchestration script.

Tests cover:
- CLI argument parsing
- Environment variable handling
- Path computation
- Story file validation
- Worker prompt loading
- Scope settings generation
- Worker output parsing
- Worker spawning
- Main loop behavior
"""

import json
import os
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Dict, Any
from unittest.mock import Mock, patch, MagicMock

import pytest

import sys
scripts_dir = Path(__file__).parent.parent / "scripts"
sys.path.insert(0, str(scripts_dir))

from implement import (
    create_argument_parser,
    get_environment_vars,
    compute_worktree_path,
    compute_story_path,
    validate_story_files,
    load_worker_prompt,
    prepend_context_to_prompt,
    build_scope_settings,
    parse_worker_output,
    spawn_worker,
    run_loop,
    EnvironmentError,
    StoryFileError,
    WorkerPromptError,
    WorkerOutputError,
    WorkerSpawnError,
    DEFAULT_MAX_CYCLES,
    DEFAULT_MAX_TIME,
    DEFAULT_MODEL,
)


# ============================================================================
# Test Fixtures
# ============================================================================

@pytest.fixture
def temp_project():
    """Create a temporary project with V2 structure."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project = Path(tmpdir)
        yield project


@pytest.fixture
def temp_worktree(temp_project):
    """Create a temporary worktree for testing."""
    epic_slug = "test-epic"
    story_slug = "test-story"
    worktree = temp_project / ".claude-tasks" / "worktrees" / epic_slug / story_slug
    worktree.mkdir(parents=True)

    # Create story.md
    story_dir = worktree / ".claude-tasks" / "epics" / epic_slug / "stories" / story_slug
    story_dir.mkdir(parents=True)
    (story_dir / "story.md").write_text("""---
slug: test-story
title: Test Story
status: ready
---

## Context
Test story for unit testing.
""")

    yield {
        "project": temp_project,
        "worktree": worktree,
        "epic_slug": epic_slug,
        "story_slug": story_slug
    }


@pytest.fixture
def temp_skill_root(temp_project):
    """Create a temporary skill root with worker-prompt.md."""
    skill_root = temp_project / "plugin" / "skills" / "execute-story"
    skill_root.mkdir(parents=True)
    (skill_root / "worker-prompt.md").write_text("# Test Worker Prompt\n\nInstructions here.")

    scripts_dir = skill_root / "scripts"
    scripts_dir.mkdir(parents=True)
    (scripts_dir / "scope_validator.sh").write_text("#!/bin/bash\nexit 0")

    return temp_project / "plugin"


# ============================================================================
# CLI Argument Parsing Tests
# ============================================================================

class TestCLIArgumentParsing:
    """Tests for CLI argument parsing."""

    def test_requires_epic_slug(self):
        """Epic slug is required."""
        parser = create_argument_parser()
        with pytest.raises(SystemExit):
            parser.parse_args([])

    def test_requires_story_slug(self):
        """Story slug is required."""
        parser = create_argument_parser()
        with pytest.raises(SystemExit):
            parser.parse_args(["epic-slug"])

    def test_accepts_positional_args(self):
        """Accepts epic_slug and story_slug positional arguments."""
        parser = create_argument_parser()
        args = parser.parse_args(["my-epic", "my-story"])
        assert args.epic_slug == "my-epic"
        assert args.story_slug == "my-story"

    def test_max_cycles_default(self):
        """Max cycles defaults to DEFAULT_MAX_CYCLES."""
        parser = create_argument_parser()
        args = parser.parse_args(["epic", "story"])
        assert args.max_cycles == DEFAULT_MAX_CYCLES

    def test_max_cycles_custom(self):
        """Max cycles can be customized."""
        parser = create_argument_parser()
        args = parser.parse_args(["epic", "story", "--max-cycles", "5"])
        assert args.max_cycles == 5

    def test_max_time_default(self):
        """Max time defaults to DEFAULT_MAX_TIME."""
        parser = create_argument_parser()
        args = parser.parse_args(["epic", "story"])
        assert args.max_time == DEFAULT_MAX_TIME

    def test_max_time_custom(self):
        """Max time can be customized."""
        parser = create_argument_parser()
        args = parser.parse_args(["epic", "story", "--max-time", "30"])
        assert args.max_time == 30

    def test_model_default(self):
        """Model defaults to DEFAULT_MODEL."""
        parser = create_argument_parser()
        args = parser.parse_args(["epic", "story"])
        assert args.model == DEFAULT_MODEL

    def test_model_custom(self):
        """Model can be customized."""
        parser = create_argument_parser()
        args = parser.parse_args(["epic", "story", "--model", "sonnet"])
        assert args.model == "sonnet"


# ============================================================================
# Environment Variable Tests
# ============================================================================

class TestEnvironmentVars:
    """Tests for environment variable handling."""

    def test_gets_plugin_root(self):
        """Gets CLAUDE_PLUGIN_ROOT from environment."""
        with patch.dict(os.environ, {
            "CLAUDE_PLUGIN_ROOT": "/path/to/plugin",
            "CLAUDE_PROJECT_DIR": "/path/to/project"
        }):
            env = get_environment_vars()
            assert env["plugin_root"] == "/path/to/plugin"

    def test_gets_project_dir(self):
        """Gets CLAUDE_PROJECT_DIR from environment."""
        with patch.dict(os.environ, {
            "CLAUDE_PLUGIN_ROOT": "/path/to/plugin",
            "CLAUDE_PROJECT_DIR": "/path/to/project"
        }):
            env = get_environment_vars()
            assert env["project_dir"] == "/path/to/project"

    def test_raises_if_plugin_root_missing(self):
        """Raises EnvironmentError if CLAUDE_PLUGIN_ROOT is missing."""
        with patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": "/path"}, clear=True):
            with pytest.raises(EnvironmentError):
                get_environment_vars()

    def test_raises_if_project_dir_missing(self):
        """Raises EnvironmentError if CLAUDE_PROJECT_DIR is missing."""
        with patch.dict(os.environ, {"CLAUDE_PLUGIN_ROOT": "/path"}, clear=True):
            with pytest.raises(EnvironmentError):
                get_environment_vars()


# ============================================================================
# Path Computation Tests
# ============================================================================

class TestPathComputation:
    """Tests for path computation functions."""

    def test_compute_worktree_path(self):
        """Computes correct worktree path."""
        path = compute_worktree_path("/project", "my-epic", "my-story")
        expected = Path("/project/.claude-tasks/worktrees/my-epic/my-story")
        assert path == expected

    def test_compute_story_path(self):
        """Computes correct story.md path."""
        worktree = Path("/project/.claude-tasks/worktrees/epic/story")
        path = compute_story_path(worktree, "epic", "story")
        expected = worktree / ".claude-tasks/epics/epic/stories/story/story.md"
        assert path == expected


# ============================================================================
# Story File Validation Tests
# ============================================================================

class TestStoryFileValidation:
    """Tests for story file validation."""

    def test_validates_existing_files(self, temp_worktree):
        """Returns valid=True when all files exist."""
        result = validate_story_files(
            temp_worktree["worktree"],
            temp_worktree["epic_slug"],
            temp_worktree["story_slug"]
        )
        assert result["valid"] is True
        assert result["error"] is None

    def test_returns_worktree_path(self, temp_worktree):
        """Returns the worktree path in result."""
        result = validate_story_files(
            temp_worktree["worktree"],
            temp_worktree["epic_slug"],
            temp_worktree["story_slug"]
        )
        assert result["worktree_path"] == str(temp_worktree["worktree"])

    def test_returns_story_path(self, temp_worktree):
        """Returns the story.md path in result."""
        result = validate_story_files(
            temp_worktree["worktree"],
            temp_worktree["epic_slug"],
            temp_worktree["story_slug"]
        )
        assert "story.md" in result["story_path"]

    def test_invalid_when_worktree_missing(self, temp_project):
        """Returns valid=False when worktree doesn't exist."""
        worktree = temp_project / ".claude-tasks" / "worktrees" / "nonexistent" / "story"
        result = validate_story_files(worktree, "nonexistent", "story")
        assert result["valid"] is False
        assert "does not exist" in result["error"]

    def test_invalid_when_story_missing(self, temp_worktree):
        """Returns valid=False when story.md doesn't exist."""
        # Delete story.md
        story_path = compute_story_path(
            temp_worktree["worktree"],
            temp_worktree["epic_slug"],
            temp_worktree["story_slug"]
        )
        story_path.unlink()

        result = validate_story_files(
            temp_worktree["worktree"],
            temp_worktree["epic_slug"],
            temp_worktree["story_slug"]
        )
        assert result["valid"] is False
        assert "not found" in result["error"]


# ============================================================================
# Worker Prompt Tests
# ============================================================================

class TestWorkerPrompt:
    """Tests for worker prompt loading and context injection."""

    def test_loads_worker_prompt(self, temp_skill_root):
        """Loads worker prompt from skill root."""
        prompt = load_worker_prompt(str(temp_skill_root))
        assert "Test Worker Prompt" in prompt

    def test_raises_if_prompt_missing(self, temp_project):
        """Raises WorkerPromptError if prompt file doesn't exist."""
        with pytest.raises(WorkerPromptError):
            load_worker_prompt(str(temp_project / "nonexistent"))

    def test_prepends_context_variables(self):
        """Prepends context variables to prompt."""
        base_prompt = "# Instructions"
        result = prepend_context_to_prompt(
            base_prompt,
            Path("/worktree"),
            "/plugin",
            "/project",
            "epic",
            "story"
        )
        assert "**Worktree Root:**" in result
        assert "**Epic:** epic" in result
        assert "**Story:** story" in result
        assert "# Instructions" in result


# ============================================================================
# Scope Settings Tests
# ============================================================================

class TestScopeSettings:
    """Tests for scope enforcement settings generation."""

    def test_builds_hooks_config(self):
        """Builds settings with hooks configuration."""
        settings = build_scope_settings("/plugin", "epic", "story")
        assert "hooks" in settings
        assert "PreToolUse" in settings["hooks"]

    def test_hook_targets_file_operations(self):
        """Hook targets Read, Write, Edit operations."""
        settings = build_scope_settings("/plugin", "epic", "story")
        hook = settings["hooks"]["PreToolUse"][0]
        assert "Read|Write|Edit" in hook["matcher"]

    def test_hook_includes_epic_and_story(self):
        """Hook command includes epic and story slugs."""
        settings = build_scope_settings("/plugin", "my-epic", "my-story")
        hook = settings["hooks"]["PreToolUse"][0]
        assert "my-epic" in hook["hooks"][0]
        assert "my-story" in hook["hooks"][0]


# ============================================================================
# Worker Output Parsing Tests
# ============================================================================

class TestWorkerOutputParsing:
    """Tests for worker output parsing."""

    def test_parses_valid_ongoing_output(self):
        """Parses valid ONGOING output."""
        output = json.dumps({
            "structured_output": {
                "status": "ONGOING",
                "summary": "Made progress",
                "blocker": None
            }
        })
        result = parse_worker_output(output)
        assert result["status"] == "ONGOING"
        assert result["summary"] == "Made progress"

    def test_parses_valid_finish_output(self):
        """Parses valid FINISH output."""
        output = json.dumps({
            "structured_output": {
                "status": "FINISH",
                "summary": "Completed all tasks"
            }
        })
        result = parse_worker_output(output)
        assert result["status"] == "FINISH"

    def test_parses_valid_blocked_output(self):
        """Parses valid BLOCKED output."""
        output = json.dumps({
            "structured_output": {
                "status": "BLOCKED",
                "summary": "Need guidance",
                "blocker": "Unclear requirements"
            }
        })
        result = parse_worker_output(output)
        assert result["status"] == "BLOCKED"
        assert result["blocker"] == "Unclear requirements"

    def test_adds_default_blocker(self):
        """Adds default None blocker if not present."""
        output = json.dumps({
            "structured_output": {
                "status": "ONGOING",
                "summary": "Progress"
            }
        })
        result = parse_worker_output(output)
        assert result["blocker"] is None

    def test_raises_on_empty_output(self):
        """Raises WorkerOutputError on empty output."""
        with pytest.raises(WorkerOutputError):
            parse_worker_output("")

    def test_raises_on_invalid_json(self):
        """Raises WorkerOutputError on invalid JSON."""
        with pytest.raises(WorkerOutputError):
            parse_worker_output("not json")

    def test_raises_on_missing_status(self):
        """Raises WorkerOutputError if status is missing."""
        output = json.dumps({
            "structured_output": {"summary": "test"}
        })
        with pytest.raises(WorkerOutputError):
            parse_worker_output(output)

    def test_raises_on_invalid_status(self):
        """Raises WorkerOutputError on invalid status value."""
        output = json.dumps({
            "structured_output": {
                "status": "INVALID",
                "summary": "test"
            }
        })
        with pytest.raises(WorkerOutputError):
            parse_worker_output(output)

    def test_handles_error_response(self):
        """Handles error responses from claude CLI."""
        output = json.dumps({
            "is_error": True,
            "result": "API error"
        })
        with pytest.raises(WorkerOutputError) as exc:
            parse_worker_output(output)
        assert "API error" in str(exc.value)


# ============================================================================
# Worker Spawning Tests
# ============================================================================

class TestWorkerSpawning:
    """Tests for worker spawning."""

    @patch("implement.subprocess.run")
    def test_builds_correct_command(self, mock_run):
        """Builds command with all required flags."""
        mock_run.return_value = Mock(stdout='{"structured_output": {}}')

        spawn_worker("prompt", "opus", {"hooks": {}}, "/workdir")

        cmd = mock_run.call_args[0][0]
        assert "claude" in cmd
        assert "-p" in cmd
        assert "--model" in cmd
        assert "--output-format" in cmd
        assert "--json-schema" in cmd
        assert "--settings" in cmd
        assert "--dangerously-skip-permissions" in cmd

    @patch("implement.subprocess.run")
    def test_passes_working_directory(self, mock_run):
        """Passes working directory to subprocess."""
        mock_run.return_value = Mock(stdout='{}')

        spawn_worker("prompt", "opus", {}, "/my/workdir")

        assert mock_run.call_args[1]["cwd"] == "/my/workdir"

    @patch("implement.subprocess.run")
    def test_returns_stdout(self, mock_run):
        """Returns stdout from subprocess."""
        mock_run.return_value = Mock(stdout='{"result": "ok"}')

        result = spawn_worker("prompt", "opus", {}, "/workdir")

        assert result == '{"result": "ok"}'

    @patch("implement.subprocess.run")
    def test_raises_on_spawn_failure(self, mock_run):
        """Raises WorkerSpawnError on spawn failure."""
        mock_run.side_effect = OSError("spawn failed")

        with pytest.raises(WorkerSpawnError):
            spawn_worker("prompt", "opus", {}, "/workdir")


# ============================================================================
# Main Loop Tests
# ============================================================================

class TestMainLoop:
    """Tests for the main orchestration loop."""

    @patch("implement.spawn_worker")
    @patch("implement.load_worker_prompt")
    @patch("implement.get_environment_vars")
    def test_exits_on_finish(self, mock_env, mock_prompt, mock_spawn, temp_worktree):
        """Loop exits when worker returns FINISH."""
        mock_env.return_value = {
            "plugin_root": str(temp_worktree["project"] / "plugin"),
            "project_dir": str(temp_worktree["project"])
        }
        mock_prompt.return_value = "prompt"
        mock_spawn.return_value = json.dumps({
            "structured_output": {
                "status": "FINISH",
                "summary": "Done"
            }
        })

        # Create plugin structure
        skill_root = temp_worktree["project"] / "plugin" / "skills" / "execute-story"
        skill_root.mkdir(parents=True)
        (skill_root / "scripts").mkdir()

        result = run_loop(
            temp_worktree["epic_slug"],
            temp_worktree["story_slug"],
            max_cycles=10,
            max_time=60,
            model="opus"
        )

        assert result["status"] == "FINISH"
        assert result["cycles"] == 1

    @patch("implement.spawn_worker")
    @patch("implement.load_worker_prompt")
    @patch("implement.get_environment_vars")
    def test_exits_on_blocked(self, mock_env, mock_prompt, mock_spawn, temp_worktree):
        """Loop exits when worker returns BLOCKED."""
        mock_env.return_value = {
            "plugin_root": str(temp_worktree["project"] / "plugin"),
            "project_dir": str(temp_worktree["project"])
        }
        mock_prompt.return_value = "prompt"
        mock_spawn.return_value = json.dumps({
            "structured_output": {
                "status": "BLOCKED",
                "summary": "Need help",
                "blocker": "Unclear spec"
            }
        })

        skill_root = temp_worktree["project"] / "plugin" / "skills" / "execute-story"
        skill_root.mkdir(parents=True)
        (skill_root / "scripts").mkdir()

        result = run_loop(
            temp_worktree["epic_slug"],
            temp_worktree["story_slug"],
            max_cycles=10,
            max_time=60,
            model="opus"
        )

        assert result["status"] == "BLOCKED"
        assert result["blocker"] == "Unclear spec"

    @patch("implement.spawn_worker")
    @patch("implement.load_worker_prompt")
    @patch("implement.get_environment_vars")
    def test_continues_on_ongoing(self, mock_env, mock_prompt, mock_spawn, temp_worktree):
        """Loop continues when worker returns ONGOING."""
        mock_env.return_value = {
            "plugin_root": str(temp_worktree["project"] / "plugin"),
            "project_dir": str(temp_worktree["project"])
        }
        mock_prompt.return_value = "prompt"

        # Return ONGOING twice, then FINISH
        mock_spawn.side_effect = [
            json.dumps({"structured_output": {"status": "ONGOING", "summary": "1"}}),
            json.dumps({"structured_output": {"status": "ONGOING", "summary": "2"}}),
            json.dumps({"structured_output": {"status": "FINISH", "summary": "3"}})
        ]

        skill_root = temp_worktree["project"] / "plugin" / "skills" / "execute-story"
        skill_root.mkdir(parents=True)
        (skill_root / "scripts").mkdir()

        result = run_loop(
            temp_worktree["epic_slug"],
            temp_worktree["story_slug"],
            max_cycles=10,
            max_time=60,
            model="opus"
        )

        assert result["status"] == "FINISH"
        assert result["cycles"] == 3

    @patch("implement.spawn_worker")
    @patch("implement.load_worker_prompt")
    @patch("implement.get_environment_vars")
    def test_respects_max_cycles(self, mock_env, mock_prompt, mock_spawn, temp_worktree):
        """Loop stops at max_cycles."""
        mock_env.return_value = {
            "plugin_root": str(temp_worktree["project"] / "plugin"),
            "project_dir": str(temp_worktree["project"])
        }
        mock_prompt.return_value = "prompt"
        mock_spawn.return_value = json.dumps({
            "structured_output": {"status": "ONGOING", "summary": "Progress"}
        })

        skill_root = temp_worktree["project"] / "plugin" / "skills" / "execute-story"
        skill_root.mkdir(parents=True)
        (skill_root / "scripts").mkdir()

        result = run_loop(
            temp_worktree["epic_slug"],
            temp_worktree["story_slug"],
            max_cycles=3,
            max_time=60,
            model="opus"
        )

        assert result["status"] == "MAX_CYCLES"
        assert result["cycles"] == 3

    @patch("implement.spawn_worker")
    @patch("implement.load_worker_prompt")
    @patch("implement.get_environment_vars")
    def test_includes_epic_and_story_in_result(self, mock_env, mock_prompt, mock_spawn, temp_worktree):
        """Result includes epic and story slugs."""
        mock_env.return_value = {
            "plugin_root": str(temp_worktree["project"] / "plugin"),
            "project_dir": str(temp_worktree["project"])
        }
        mock_prompt.return_value = "prompt"
        mock_spawn.return_value = json.dumps({
            "structured_output": {"status": "FINISH", "summary": "Done"}
        })

        skill_root = temp_worktree["project"] / "plugin" / "skills" / "execute-story"
        skill_root.mkdir(parents=True)
        (skill_root / "scripts").mkdir()

        result = run_loop(
            temp_worktree["epic_slug"],
            temp_worktree["story_slug"],
            max_cycles=10,
            max_time=60,
            model="opus"
        )

        assert result["epic_slug"] == temp_worktree["epic_slug"]
        assert result["story_slug"] == temp_worktree["story_slug"]

    @patch("implement.get_environment_vars")
    def test_raises_on_missing_worktree(self, mock_env, temp_project):
        """Raises StoryFileError when worktree doesn't exist."""
        mock_env.return_value = {
            "plugin_root": str(temp_project / "plugin"),
            "project_dir": str(temp_project)
        }

        with pytest.raises(StoryFileError):
            run_loop("nonexistent", "story", 10, 60, "opus")
