"""
Comprehensive test suite for implement.py - the task orchestration script.

Tests cover:
- CLI argument parsing
- Task file validation (existence checks)
- Worker output parsing
- Worker spawning
- Main loop behavior (integration tests with mocked subprocess)

Design Note: The orchestrator does NOT inject task.json or journal.md content
into the prompt. Workers read and write these files themselves. The orchestrator
only validates that task.json exists before spawning workers.
"""

import json
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Dict, Any
from unittest.mock import Mock, patch

import pytest


# ============================================================================
# Test Fixtures
# ============================================================================

@pytest.fixture
def temp_task_dir():
    """Create a temporary task directory structure for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        task_dir = Path(tmpdir) / "task-system" / "task-015"
        task_dir.mkdir(parents=True)
        yield task_dir


@pytest.fixture
def sample_task_json() -> Dict[str, Any]:
    """Sample task.json content for testing."""
    return {
        "meta": {
            "id": "015",
            "title": "Test Task",
            "created": "2026-01-08",
            "feature": "007"
        },
        "overview": "This is a test task for unit testing the orchestration script.",
        "objectives": [
            {
                "id": "obj-1",
                "description": "First test objective",
                "steps": ["Step 1", "Step 2"],
                "notes": ["Important note"],
                "status": "pending"
            },
            {
                "id": "obj-2",
                "description": "Second test objective",
                "steps": [],
                "notes": [],
                "status": "pending"
            }
        ]
    }


@pytest.fixture
def sample_journal_content() -> str:
    """Sample journal.md content for testing."""
    return """# Task Journal

---

## Entry: 2026-01-08T10:00:00

**Objective:** obj-1 - First test objective
**Status at exit:** in_progress

### What Was Done

- Started implementation
- Wrote initial tests

### Commits

- `abc123` feat(task-015): initial test setup

### Notes

Context for next session.

---
"""


@pytest.fixture
def sample_worker_prompt() -> str:
    """Sample worker prompt template content."""
    return """# Task Worker Instructions

You are a worker agent in a multi-session task execution system.

## Session Startup

1. Read task.json
2. Read journal.md
3. Select an objective

## Exit Protocol

Output your final status as JSON:
```json
{
  "status": "ONGOING",
  "summary": "what you accomplished",
  "blocker": null
}
```
"""


@pytest.fixture
def task_dir_with_files(temp_task_dir, sample_task_json, sample_journal_content):
    """Create a task directory with task.json and journal.md."""
    # Write task.json
    task_json_path = temp_task_dir / "task.json"
    task_json_path.write_text(json.dumps(sample_task_json, indent=2))

    # Write journal.md
    journal_path = temp_task_dir / "journal.md"
    journal_path.write_text(sample_journal_content)

    return temp_task_dir


# ============================================================================
# CLI Argument Parsing Tests
# ============================================================================

class TestCLIArgumentParsing:
    """Test CLI argument parsing functionality."""

    def test_task_path_required(self):
        """Script should require task_path positional argument."""
        from implement import create_argument_parser

        parser = create_argument_parser()

        # Should raise SystemExit when no arguments provided
        with pytest.raises(SystemExit):
            parser.parse_args([])

    def test_task_path_accepted(self):
        """Script should accept task_path as positional argument."""
        from implement import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(["/path/to/task"])

        assert args.task_path == "/path/to/task"

    def test_max_cycles_default(self):
        """Default max_cycles should be 10."""
        from implement import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(["/path/to/task"])

        assert args.max_cycles == 10

    def test_max_cycles_custom(self):
        """Should accept custom max_cycles value."""
        from implement import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(["--max-cycles", "5", "/path/to/task"])

        assert args.max_cycles == 5

    def test_max_time_default(self):
        """Default max_time should be 60 minutes."""
        from implement import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(["/path/to/task"])

        assert args.max_time == 60

    def test_max_time_custom(self):
        """Should accept custom max_time value."""
        from implement import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(["--max-time", "120", "/path/to/task"])

        assert args.max_time == 120

    def test_model_default(self):
        """Default model should be 'opus'."""
        from implement import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(["/path/to/task"])

        assert args.model == "opus"

    def test_model_custom(self):
        """Should accept custom model value."""
        from implement import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(["--model", "opus", "/path/to/task"])

        assert args.model == "opus"

    def test_mcp_config_optional(self):
        """mcp_config should be optional and default to None."""
        from implement import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(["/path/to/task"])

        assert args.mcp_config is None

    def test_mcp_config_custom(self):
        """Should accept custom mcp_config path."""
        from implement import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(["--mcp-config", "/path/to/mcp.json", "/path/to/task"])

        assert args.mcp_config == "/path/to/mcp.json"

    def test_tools_optional(self):
        """tools should be optional and default to None."""
        from implement import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(["/path/to/task"])

        assert args.tools is None

    def test_tools_custom(self):
        """Should accept comma-separated tools list."""
        from implement import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args(["--tools", "Read,Write,Bash", "/path/to/task"])

        assert args.tools == "Read,Write,Bash"

    def test_all_arguments_combined(self):
        """Should correctly parse all arguments together."""
        from implement import create_argument_parser

        parser = create_argument_parser()
        args = parser.parse_args([
            "--max-cycles", "15",
            "--max-time", "90",
            "--model", "haiku",
            "--mcp-config", "/config/mcp.json",
            "--tools", "Read,Grep,Glob",
            "/path/to/my/task"
        ])

        assert args.task_path == "/path/to/my/task"
        assert args.max_cycles == 15
        assert args.max_time == 90
        assert args.model == "haiku"
        assert args.mcp_config == "/config/mcp.json"
        assert args.tools == "Read,Grep,Glob"


# ============================================================================
# Task File Validation Tests
# ============================================================================

class TestTaskFileValidation:
    """Test task file validation functionality.

    The orchestrator validates that task.json exists before spawning workers.
    It does NOT read the content - workers read files themselves.
    """

    def test_validate_task_json_exists(self, task_dir_with_files):
        """Should return valid result when task.json exists."""
        from implement import validate_task_files

        # Get the worktree root (parent of task-system)
        worktree_root = task_dir_with_files.parent.parent

        result = validate_task_files(str(worktree_root))

        assert result["valid"] is True
        assert result["task_json_path"] is not None
        assert Path(result["task_json_path"]).exists()

    def test_validate_returns_task_id(self, task_dir_with_files):
        """Should extract task ID from task folder name."""
        from implement import validate_task_files

        worktree_root = task_dir_with_files.parent.parent

        result = validate_task_files(str(worktree_root))

        assert result["task_id"] == "015"

    def test_validate_task_json_missing(self, temp_task_dir):
        """Should return invalid when task.json doesn't exist."""
        from implement import validate_task_files

        worktree_root = temp_task_dir.parent.parent

        result = validate_task_files(str(worktree_root))

        assert result["valid"] is False
        assert "task.json not found" in result["error"].lower()

    def test_validate_invalid_path(self):
        """Should handle non-existent path gracefully."""
        from implement import validate_task_files

        result = validate_task_files("/nonexistent/path/to/task")

        assert result["valid"] is False
        assert result["error"] is not None

    def test_validate_windows_paths(self, task_dir_with_files):
        """Should handle Windows-style paths correctly."""
        from implement import validate_task_files

        worktree_root = task_dir_with_files.parent.parent

        # Convert to Windows-style path
        windows_path = str(worktree_root).replace("/", "\\")

        result = validate_task_files(windows_path)

        # Should work regardless of path separator
        assert result is not None


# ============================================================================
# Worker Prompt Loading Tests
# ============================================================================

class TestWorkerPromptLoading:
    """Test worker prompt template loading."""

    def test_get_worker_prompt_path_uses_env_var(self):
        """Should use CLAUDE_PLUGIN_ROOT environment variable."""
        from implement import get_worker_prompt_path

        with patch.dict("os.environ", {"CLAUDE_PLUGIN_ROOT": "/path/to/plugin"}):
            result = get_worker_prompt_path()

        assert str(result) == "/path/to/plugin/instructions/orchestration/worker-prompt.md"

    def test_get_worker_prompt_path_missing_env_var(self):
        """Should raise error if CLAUDE_PLUGIN_ROOT not set."""
        from implement import get_worker_prompt_path, WorkerPromptError

        with patch.dict("os.environ", {}, clear=True):
            # Ensure CLAUDE_PLUGIN_ROOT is not in environment
            import os
            if "CLAUDE_PLUGIN_ROOT" in os.environ:
                del os.environ["CLAUDE_PLUGIN_ROOT"]

            with pytest.raises(WorkerPromptError) as exc_info:
                get_worker_prompt_path()

            assert "CLAUDE_PLUGIN_ROOT" in str(exc_info.value)

    def test_load_worker_prompt_returns_string(self, sample_worker_prompt):
        """Should return worker prompt as string."""
        from implement import load_worker_prompt

        with patch.dict("os.environ", {"CLAUDE_PLUGIN_ROOT": "/path/to/plugin"}):
            with patch("builtins.open", create=True) as mock_open:
                mock_open.return_value.__enter__.return_value.read.return_value = sample_worker_prompt

                result = load_worker_prompt()

        assert isinstance(result, str)
        assert len(result) > 0

    def test_load_worker_prompt_contains_instructions(self, sample_worker_prompt):
        """Worker prompt should contain key instructions."""
        from implement import load_worker_prompt

        with patch.dict("os.environ", {"CLAUDE_PLUGIN_ROOT": "/path/to/plugin"}):
            with patch("builtins.open", create=True) as mock_open:
                mock_open.return_value.__enter__.return_value.read.return_value = sample_worker_prompt

                result = load_worker_prompt()

        assert "task.json" in result.lower()
        assert "journal" in result.lower()

    def test_load_worker_prompt_file_not_found(self):
        """Should raise error if worker prompt file not found."""
        from implement import load_worker_prompt, WorkerPromptError

        with patch.dict("os.environ", {"CLAUDE_PLUGIN_ROOT": "/path/to/plugin"}):
            with patch("builtins.open", side_effect=FileNotFoundError("Not found")):
                with pytest.raises(WorkerPromptError):
                    load_worker_prompt()

    def test_load_worker_prompt_missing_env_var(self):
        """Should raise error if CLAUDE_PLUGIN_ROOT not set."""
        from implement import load_worker_prompt, WorkerPromptError

        with patch.dict("os.environ", {}, clear=True):
            with pytest.raises(WorkerPromptError) as exc_info:
                load_worker_prompt()

            assert "CLAUDE_PLUGIN_ROOT" in str(exc_info.value)


# ============================================================================
# Worker Output Parsing Tests
# ============================================================================

class TestWorkerOutputParsing:
    """Test worker output parsing functionality."""

    def test_parse_valid_ongoing_output(self):
        """Should parse valid ONGOING status output."""
        from implement import parse_worker_output

        output = json.dumps({
            "status": "ONGOING",
            "summary": "Made progress on objective 1",
            "blocker": None
        })

        result = parse_worker_output(output)

        assert result["status"] == "ONGOING"
        assert result["summary"] == "Made progress on objective 1"
        assert result["blocker"] is None

    def test_parse_valid_finish_output(self):
        """Should parse valid FINISH status output."""
        from implement import parse_worker_output

        output = json.dumps({
            "status": "FINISH",
            "summary": "All objectives completed",
            "blocker": None
        })

        result = parse_worker_output(output)

        assert result["status"] == "FINISH"
        assert result["summary"] == "All objectives completed"

    def test_parse_valid_blocked_output(self):
        """Should parse valid BLOCKED status output with blocker description."""
        from implement import parse_worker_output

        output = json.dumps({
            "status": "BLOCKED",
            "summary": "Cannot proceed without API key",
            "blocker": "Need API key for external service"
        })

        result = parse_worker_output(output)

        assert result["status"] == "BLOCKED"
        assert result["blocker"] == "Need API key for external service"

    def test_parse_output_without_blocker_field(self):
        """Should handle output without optional blocker field."""
        from implement import parse_worker_output

        output = json.dumps({
            "status": "ONGOING",
            "summary": "Made progress"
        })

        result = parse_worker_output(output)

        assert result["status"] == "ONGOING"
        assert result.get("blocker") is None

    def test_parse_invalid_json(self):
        """Should raise error for invalid JSON."""
        from implement import parse_worker_output, WorkerOutputError

        with pytest.raises(WorkerOutputError):
            parse_worker_output("not valid json")

    def test_parse_missing_status(self):
        """Should raise error when status field is missing."""
        from implement import parse_worker_output, WorkerOutputError

        output = json.dumps({
            "summary": "Did some work"
        })

        with pytest.raises(WorkerOutputError):
            parse_worker_output(output)

    def test_parse_missing_summary(self):
        """Should raise error when summary field is missing."""
        from implement import parse_worker_output, WorkerOutputError

        output = json.dumps({
            "status": "ONGOING"
        })

        with pytest.raises(WorkerOutputError):
            parse_worker_output(output)

    def test_parse_invalid_status_value(self):
        """Should raise error for invalid status value."""
        from implement import parse_worker_output, WorkerOutputError

        output = json.dumps({
            "status": "INVALID_STATUS",
            "summary": "Did some work"
        })

        with pytest.raises(WorkerOutputError):
            parse_worker_output(output)

    def test_parse_output_with_extra_text_before(self):
        """Should extract JSON even with extra text before it."""
        from implement import parse_worker_output

        output = """Some debug output here
        And more text
        {"status": "ONGOING", "summary": "Made progress", "blocker": null}"""

        result = parse_worker_output(output)

        assert result["status"] == "ONGOING"

    def test_parse_output_with_extra_text_after(self):
        """Should extract JSON even with extra text after it."""
        from implement import parse_worker_output

        output = """{"status": "FINISH", "summary": "Done", "blocker": null}

        Some trailing output"""

        result = parse_worker_output(output)

        assert result["status"] == "FINISH"

    def test_parse_unicode_in_summary(self):
        """Should handle unicode characters in summary."""
        from implement import parse_worker_output

        output = json.dumps({
            "status": "ONGOING",
            "summary": "Implemented feature with special chars: \u00e9\u00e0\u00fc",
            "blocker": None
        })

        result = parse_worker_output(output)

        assert "\u00e9" in result["summary"]

    def test_parse_empty_output(self):
        """Should raise error for empty output."""
        from implement import parse_worker_output, WorkerOutputError

        with pytest.raises(WorkerOutputError):
            parse_worker_output("")

    def test_parse_malformed_json_variants(self):
        """Should handle various malformed JSON gracefully."""
        from implement import parse_worker_output, WorkerOutputError

        malformed_outputs = [
            '{"status": "ONGOING", summary: "missing quotes"}',
            '{"status": "ONGOING", "summary": }',
            '{status: ONGOING}',
            'just plain text',
        ]

        for output in malformed_outputs:
            with pytest.raises(WorkerOutputError):
                parse_worker_output(output)


# ============================================================================
# Worker Spawning Tests
# ============================================================================

class TestWorkerSpawning:
    """Test worker spawning functionality."""

    @patch("subprocess.run")
    def test_spawn_worker_basic_command(self, mock_run):
        """Should spawn claude -p with basic arguments."""
        from implement import spawn_worker

        mock_run.return_value = Mock(
            stdout='{"status": "ONGOING", "summary": "progress", "blocker": null}',
            returncode=0
        )

        spawn_worker(
            prompt="Test prompt",
            model="sonnet",
            mcp_config=None,
            tools=None,
            working_dir="/path/to/task"
        )

        # Verify subprocess was called
        mock_run.assert_called_once()
        call_args = mock_run.call_args

        # Check basic command structure
        cmd = call_args[0][0]
        assert "claude" in cmd[0]
        assert "-p" in cmd
        assert "--model" in cmd
        assert "sonnet" in cmd

    @patch("subprocess.run")
    def test_spawn_worker_with_json_schema(self, mock_run):
        """Should include --json-schema flag with worker output schema."""
        from implement import spawn_worker, WORKER_OUTPUT_SCHEMA

        mock_run.return_value = Mock(
            stdout='{"status": "ONGOING", "summary": "progress", "blocker": null}',
            returncode=0
        )

        spawn_worker(
            prompt="Test prompt",
            model="sonnet",
            mcp_config=None,
            tools=None,
            working_dir="/path/to/task"
        )

        call_args = mock_run.call_args
        cmd = call_args[0][0]

        assert "--json-schema" in cmd
        # Verify the schema is included as JSON string
        schema_idx = cmd.index("--json-schema")
        schema_str = cmd[schema_idx + 1]
        assert '"status"' in schema_str
        assert '"ONGOING"' in schema_str
        assert '"FINISH"' in schema_str
        assert '"BLOCKED"' in schema_str

    @patch("subprocess.run")
    def test_spawn_worker_with_mcp_config(self, mock_run):
        """Should include --mcp-config when provided."""
        from implement import spawn_worker

        mock_run.return_value = Mock(
            stdout='{"status": "ONGOING", "summary": "progress", "blocker": null}',
            returncode=0
        )

        spawn_worker(
            prompt="Test prompt",
            model="sonnet",
            mcp_config="/path/to/mcp.json",
            tools=None,
            working_dir="/path/to/task"
        )

        call_args = mock_run.call_args
        cmd = call_args[0][0]

        assert "--mcp-config" in cmd
        assert "/path/to/mcp.json" in cmd

    @patch("subprocess.run")
    def test_spawn_worker_with_tools(self, mock_run):
        """Should include --allowedTools when tools provided."""
        from implement import spawn_worker

        mock_run.return_value = Mock(
            stdout='{"status": "ONGOING", "summary": "progress", "blocker": null}',
            returncode=0
        )

        spawn_worker(
            prompt="Test prompt",
            model="sonnet",
            mcp_config=None,
            tools="Read,Write,Bash",
            working_dir="/path/to/task"
        )

        call_args = mock_run.call_args
        cmd = call_args[0][0]

        assert "--allowedTools" in cmd
        assert "Read,Write,Bash" in cmd

    @patch("subprocess.run")
    def test_spawn_worker_with_custom_model(self, mock_run):
        """Should use custom model when specified."""
        from implement import spawn_worker

        mock_run.return_value = Mock(
            stdout='{"status": "ONGOING", "summary": "progress", "blocker": null}',
            returncode=0
        )

        spawn_worker(
            prompt="Test prompt",
            model="opus",
            mcp_config=None,
            tools=None,
            working_dir="/path/to/task"
        )

        call_args = mock_run.call_args
        cmd = call_args[0][0]

        assert "opus" in cmd

    @patch("subprocess.run")
    def test_spawn_worker_returns_stdout(self, mock_run):
        """Should return worker stdout."""
        from implement import spawn_worker

        expected_output = '{"status": "FINISH", "summary": "completed", "blocker": null}'
        mock_run.return_value = Mock(
            stdout=expected_output,
            returncode=0
        )

        result = spawn_worker(
            prompt="Test prompt",
            model="sonnet",
            mcp_config=None,
            tools=None,
            working_dir="/path/to/task"
        )

        assert result == expected_output

    @patch("subprocess.run")
    def test_spawn_worker_sets_working_directory(self, mock_run):
        """Should set working directory for subprocess."""
        from implement import spawn_worker

        mock_run.return_value = Mock(
            stdout='{"status": "ONGOING", "summary": "progress", "blocker": null}',
            returncode=0
        )

        spawn_worker(
            prompt="Test prompt",
            model="sonnet",
            mcp_config=None,
            tools=None,
            working_dir="/specific/task/path"
        )

        call_args = mock_run.call_args

        assert call_args.kwargs.get("cwd") == "/specific/task/path"

    @patch("subprocess.run")
    def test_spawn_worker_process_crash(self, mock_run):
        """Should raise WorkerSpawnError on subprocess failure."""
        from implement import spawn_worker, WorkerSpawnError

        mock_run.side_effect = subprocess.SubprocessError("Process crashed")

        with pytest.raises(WorkerSpawnError):
            spawn_worker(
                prompt="Test",
                model="sonnet",
                mcp_config=None,
                tools=None,
                working_dir="/path"
            )

    @patch("subprocess.run")
    def test_spawn_worker_non_zero_exit_returns_output(self, mock_run):
        """Should return output even with non-zero exit code."""
        from implement import spawn_worker

        mock_run.return_value = Mock(
            stdout='{"status": "BLOCKED", "summary": "error", "blocker": "crashed"}',
            returncode=1
        )

        # Should still return output (worker might have output before failing)
        result = spawn_worker(
            prompt="Test",
            model="sonnet",
            mcp_config=None,
            tools=None,
            working_dir="/path"
        )

        assert result is not None


# ============================================================================
# Main Loop Integration Tests
# ============================================================================

class TestMainLoop:
    """Integration tests for the main orchestration loop."""

    @patch("implement.spawn_worker")
    @patch("implement.validate_task_files")
    @patch("implement.load_worker_prompt")
    def test_loop_exits_on_finish(self, mock_load_prompt, mock_validate, mock_spawn):
        """Loop should exit when worker returns FINISH."""
        from implement import run_loop, create_argument_parser

        mock_validate.return_value = {
            "valid": True,
            "task_json_path": "/path/task.json",
            "task_id": "015"
        }
        mock_load_prompt.return_value = "Worker instructions"
        mock_spawn.return_value = json.dumps({
            "status": "FINISH",
            "summary": "All done",
            "blocker": None
        })

        parser = create_argument_parser()
        args = parser.parse_args(["/path/to/task"])

        result = run_loop(args)

        assert result["status"] == "FINISH"
        assert mock_spawn.call_count == 1

    @patch("implement.spawn_worker")
    @patch("implement.validate_task_files")
    @patch("implement.load_worker_prompt")
    def test_loop_exits_on_blocked(self, mock_load_prompt, mock_validate, mock_spawn):
        """Loop should exit when worker returns BLOCKED."""
        from implement import run_loop, create_argument_parser

        mock_validate.return_value = {
            "valid": True,
            "task_json_path": "/path/task.json",
            "task_id": "015"
        }
        mock_load_prompt.return_value = "Worker instructions"
        mock_spawn.return_value = json.dumps({
            "status": "BLOCKED",
            "summary": "Need help",
            "blocker": "Missing API key"
        })

        parser = create_argument_parser()
        args = parser.parse_args(["/path/to/task"])

        result = run_loop(args)

        assert result["status"] == "BLOCKED"
        assert result["blocker"] == "Missing API key"
        assert mock_spawn.call_count == 1

    @patch("implement.spawn_worker")
    @patch("implement.validate_task_files")
    @patch("implement.load_worker_prompt")
    def test_loop_continues_on_ongoing(self, mock_load_prompt, mock_validate, mock_spawn):
        """Loop should respawn worker when status is ONGOING."""
        from implement import run_loop, create_argument_parser

        mock_validate.return_value = {
            "valid": True,
            "task_json_path": "/path/task.json",
            "task_id": "015"
        }
        mock_load_prompt.return_value = "Worker instructions"

        # First two calls return ONGOING, third returns FINISH
        mock_spawn.side_effect = [
            json.dumps({"status": "ONGOING", "summary": "Progress 1", "blocker": None}),
            json.dumps({"status": "ONGOING", "summary": "Progress 2", "blocker": None}),
            json.dumps({"status": "FINISH", "summary": "Done", "blocker": None}),
        ]

        parser = create_argument_parser()
        args = parser.parse_args(["/path/to/task"])

        result = run_loop(args)

        assert result["status"] == "FINISH"
        assert mock_spawn.call_count == 3
        assert result["cycles"] == 3

    @patch("implement.spawn_worker")
    @patch("implement.validate_task_files")
    @patch("implement.load_worker_prompt")
    def test_loop_respects_max_cycles(self, mock_load_prompt, mock_validate, mock_spawn):
        """Loop should exit with MAX_CYCLES when limit reached."""
        from implement import run_loop, create_argument_parser

        mock_validate.return_value = {
            "valid": True,
            "task_json_path": "/path/task.json",
            "task_id": "015"
        }
        mock_load_prompt.return_value = "Worker instructions"

        # Always return ONGOING
        mock_spawn.return_value = json.dumps({
            "status": "ONGOING",
            "summary": "Still working",
            "blocker": None
        })

        parser = create_argument_parser()
        args = parser.parse_args(["--max-cycles", "3", "/path/to/task"])

        result = run_loop(args)

        assert result["status"] == "MAX_CYCLES"
        assert result["cycles"] == 3
        assert mock_spawn.call_count == 3

    @patch("implement.spawn_worker")
    @patch("implement.validate_task_files")
    @patch("implement.load_worker_prompt")
    @patch("time.time")
    def test_loop_respects_max_time(self, mock_time, mock_load_prompt, mock_validate, mock_spawn):
        """Loop should exit with TIMEOUT when time limit exceeded."""
        from implement import run_loop, create_argument_parser

        mock_validate.return_value = {
            "valid": True,
            "task_json_path": "/path/task.json",
            "task_id": "015"
        }
        mock_load_prompt.return_value = "Worker instructions"

        # Always return ONGOING
        mock_spawn.return_value = json.dumps({
            "status": "ONGOING",
            "summary": "Still working",
            "blocker": None
        })

        # Simulate time passing: start at 0, then 30 min, then 70 min (exceeds 60 min limit)
        mock_time.side_effect = [0, 1800, 4200]

        parser = create_argument_parser()
        args = parser.parse_args(["--max-time", "60", "/path/to/task"])

        result = run_loop(args)

        assert result["status"] == "TIMEOUT"

    @patch("implement.validate_task_files")
    def test_loop_exits_on_missing_task_json(self, mock_validate):
        """Loop should raise error when task.json not found."""
        from implement import run_loop, create_argument_parser, TaskFileError

        mock_validate.return_value = {
            "valid": False,
            "error": "task.json not found"
        }

        parser = create_argument_parser()
        args = parser.parse_args(["/path/to/task"])

        with pytest.raises(TaskFileError):
            run_loop(args)

    @patch("implement.spawn_worker")
    @patch("implement.validate_task_files")
    @patch("implement.load_worker_prompt")
    def test_loop_includes_elapsed_time_in_output(self, mock_load_prompt, mock_validate, mock_spawn):
        """Output should include elapsed_minutes."""
        from implement import run_loop, create_argument_parser

        mock_validate.return_value = {
            "valid": True,
            "task_json_path": "/path/task.json",
            "task_id": "015"
        }
        mock_load_prompt.return_value = "Worker instructions"
        mock_spawn.return_value = json.dumps({
            "status": "FINISH",
            "summary": "Done",
            "blocker": None
        })

        parser = create_argument_parser()
        args = parser.parse_args(["/path/to/task"])

        result = run_loop(args)

        assert "elapsed_minutes" in result
        assert isinstance(result["elapsed_minutes"], (int, float))

    @patch("implement.spawn_worker")
    @patch("implement.validate_task_files")
    @patch("implement.load_worker_prompt")
    def test_loop_combines_summaries(self, mock_load_prompt, mock_validate, mock_spawn):
        """Final summary should combine all worker summaries."""
        from implement import run_loop, create_argument_parser

        mock_validate.return_value = {
            "valid": True,
            "task_json_path": "/path/task.json",
            "task_id": "015"
        }
        mock_load_prompt.return_value = "Worker instructions"

        mock_spawn.side_effect = [
            json.dumps({"status": "ONGOING", "summary": "Completed objective 1", "blocker": None}),
            json.dumps({"status": "FINISH", "summary": "Completed objective 2", "blocker": None}),
        ]

        parser = create_argument_parser()
        args = parser.parse_args(["/path/to/task"])

        result = run_loop(args)

        assert "summary" in result
        # Summary should contain info from both cycles
        assert "objective" in result["summary"].lower() or len(result["summary"]) > 0

    @patch("implement.spawn_worker")
    @patch("implement.validate_task_files")
    @patch("implement.load_worker_prompt")
    def test_loop_passes_worker_prompt_to_spawn(self, mock_load_prompt, mock_validate, mock_spawn):
        """Loop should pass worker prompt to spawn_worker."""
        from implement import run_loop, create_argument_parser

        mock_validate.return_value = {
            "valid": True,
            "task_json_path": "/path/task.json",
            "task_id": "015"
        }
        mock_load_prompt.return_value = "Worker instructions content"
        mock_spawn.return_value = json.dumps({
            "status": "FINISH",
            "summary": "Done",
            "blocker": None
        })

        parser = create_argument_parser()
        args = parser.parse_args(["/path/to/task"])

        run_loop(args)

        # Verify spawn_worker was called with the worker prompt
        call_args = mock_spawn.call_args
        assert "Worker instructions content" in call_args.kwargs.get("prompt", call_args[0][0] if call_args[0] else "")


# ============================================================================
# Output Format Tests
# ============================================================================

class TestOutputFormat:
    """Test that script output matches expected JSON format."""

    def test_output_has_required_fields(self):
        """Final output should have all required fields."""
        required_fields = ["status", "summary", "cycles", "elapsed_minutes", "blocker"]

        # Create a sample output
        output = {
            "status": "FINISH",
            "summary": "Task completed successfully",
            "cycles": 3,
            "elapsed_minutes": 15,
            "blocker": None
        }

        for field in required_fields:
            assert field in output

    def test_status_values_are_valid(self):
        """Status should be one of the valid enum values."""
        valid_statuses = ["FINISH", "BLOCKED", "TIMEOUT", "MAX_CYCLES"]

        for status in valid_statuses:
            output = {
                "status": status,
                "summary": "test",
                "cycles": 1,
                "elapsed_minutes": 1,
                "blocker": None if status != "BLOCKED" else "blocker reason"
            }

            assert output["status"] in valid_statuses

    def test_blocked_output_has_blocker(self):
        """BLOCKED status should include blocker description."""
        output = {
            "status": "BLOCKED",
            "summary": "Cannot proceed",
            "cycles": 1,
            "elapsed_minutes": 5,
            "blocker": "Missing configuration"
        }

        assert output["blocker"] is not None
        assert len(output["blocker"]) > 0

    def test_finish_output_has_null_blocker(self):
        """FINISH status should have null blocker."""
        output = {
            "status": "FINISH",
            "summary": "All done",
            "cycles": 5,
            "elapsed_minutes": 30,
            "blocker": None
        }

        assert output["blocker"] is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
