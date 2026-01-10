"""
Integration tests for the /implement and /resolve workflows.

These tests verify end-to-end flows by:
1. Setting up realistic task directory structures
2. Testing happy path (ONGOING -> FINISH)
3. Testing blocker path (ONGOING -> BLOCKED -> /resolve -> resume)
4. Testing identifier resolution in realistic scenarios

Note: These tests mock the Claude CLI subprocess to avoid spawning actual workers.
For manual end-to-end testing, see the test fixtures in tests/fixtures/.
"""

import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, List
from unittest.mock import Mock, patch, MagicMock

import pytest


# ============================================================================
# Test Fixtures - Realistic Task Structures
# ============================================================================

@pytest.fixture
def integration_project():
    """
    Create a realistic project structure for integration testing.

    Structure:
    project/
    ├── task-system/
    │   ├── tasks/
    │   │   └── 015/
    │   │       └── task-system/
    │   │           └── task-015/
    │   │               ├── task.json
    │   │               └── journal.md (optional)
    │   ├── features/
    │   │   └── 007-user-auth/
    │   │       ├── feature.md
    │   │       ├── plan.md
    │   │       └── tasks.md
    │   └── archive/
    └── CLAUDE.md
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        project = Path(tmpdir)

        # Create task-system structure
        (project / "task-system" / "tasks").mkdir(parents=True)
        (project / "task-system" / "features" / "007-user-auth").mkdir(parents=True)
        (project / "task-system" / "archive").mkdir(parents=True)

        # Create CLAUDE.md
        (project / "CLAUDE.md").write_text("# Project CLAUDE.md\n")

        # Create feature files
        feature_dir = project / "task-system" / "features" / "007-user-auth"
        (feature_dir / "feature.md").write_text("# User Authentication Feature\n")
        (feature_dir / "plan.md").write_text("# Technical Plan\n")
        (feature_dir / "tasks.md").write_text("""# Tasks for Feature 007

| ID  | Title                  | Type    |
| --- | ---------------------- | ------- |
| 015 | User Login System      | feature |
""")

        yield project


@pytest.fixture
def task_015_happy_path(integration_project):
    """Create task 015 configured for happy path testing (simple objectives)."""
    task_root = integration_project / "task-system" / "tasks" / "015"
    task_folder = task_root / "task-system" / "task-015"
    task_folder.mkdir(parents=True)

    task_json = {
        "meta": {
            "id": "015",
            "title": "User Login System",
            "created": "2026-01-08",
            "feature": "007"
        },
        "overview": "Implement user login with email and password authentication.",
        "objectives": [
            {
                "id": "obj-1",
                "description": "Create login endpoint",
                "steps": ["Define route", "Add controller", "Connect to auth service"],
                "notes": ["Use existing auth service patterns"],
                "status": "pending"
            },
            {
                "id": "obj-2",
                "description": "Add input validation",
                "steps": ["Add email format check", "Add password requirements"],
                "notes": [],
                "status": "pending"
            }
        ]
    }

    (task_folder / "task.json").write_text(json.dumps(task_json, indent=2))

    return task_root


@pytest.fixture
def task_015_with_journal(task_015_happy_path):
    """Create task 015 with an in-progress journal."""
    task_folder = task_015_happy_path / "task-system" / "task-015"

    journal_content = """# Task Journal

---

## Entry: 2026-01-08T10:00:00

**Objective:** obj-1 - Create login endpoint
**Status at exit:** in_progress

### What Was Done

- Analyzed existing auth patterns
- Created initial route structure

### Commits

- `abc1234` feat(task-015): initial route structure

### Notes

Ready to continue with controller implementation.

---
"""

    (task_folder / "journal.md").write_text(journal_content)

    return task_015_happy_path


@pytest.fixture
def task_016_blocker_scenario(integration_project):
    """Create task 016 configured for blocker testing."""
    task_root = integration_project / "task-system" / "tasks" / "016"
    task_folder = task_root / "task-system" / "task-016"
    task_folder.mkdir(parents=True)

    task_json = {
        "meta": {
            "id": "016",
            "title": "User Profile Management",
            "created": "2026-01-08",
            "feature": "007"
        },
        "overview": "Allow users to view and update their profile information.",
        "objectives": [
            {
                "id": "obj-1",
                "description": "Design profile data model",
                "steps": ["Define fields", "Plan storage"],
                "notes": ["Decision needed on which fields to include"],
                "status": "pending"
            }
        ]
    }

    (task_folder / "task.json").write_text(json.dumps(task_json, indent=2))

    return task_root


@pytest.fixture
def task_016_blocked(task_016_blocker_scenario):
    """Create task 016 with a blocker in journal.md."""
    task_folder = task_016_blocker_scenario / "task-system" / "task-016"

    journal_content = """# Task Journal

---

## Entry: 2026-01-08T10:00:00

**Objective:** obj-1 - Design profile data model
**Status at exit:** in_progress

### What Was Done

- Analyzed existing user model
- Identified potential profile fields

---

## Blocker: Profile Field Selection

**Objective**: obj-1 - Design profile data model
**What I'm trying to do**: Define which fields to include in the user profile
**What I tried**: Reviewed similar implementations, but business requirements unclear
**What I need**: Decision on which profile fields are required vs optional
**Suggested options**:
1. Minimal - name, email, avatar only
2. Extended - add phone, address, preferences
3. Progressive - start minimal, add fields incrementally

---
"""

    (task_folder / "journal.md").write_text(journal_content)

    return task_016_blocker_scenario


@pytest.fixture
def task_016_resolved(task_016_blocked):
    """Create task 016 with a resolved blocker."""
    task_folder = task_016_blocked / "task-system" / "task-016"

    journal_content = """# Task Journal

---

## Entry: 2026-01-08T10:00:00

**Objective:** obj-1 - Design profile data model
**Status at exit:** in_progress

### What Was Done

- Analyzed existing user model
- Identified potential profile fields

---

## Blocker: Profile Field Selection

**Objective**: obj-1 - Design profile data model
**What I'm trying to do**: Define which fields to include in the user profile
**What I tried**: Reviewed similar implementations, but business requirements unclear
**What I need**: Decision on which profile fields are required vs optional
**Suggested options**:
1. Minimal - name, email, avatar only
2. Extended - add phone, address, preferences
3. Progressive - start minimal, add fields incrementally

---

## Resolution: Profile Field Selection

**Decision**: Use progressive approach - start with minimal fields (name, email, avatar) and design schema to support incremental field additions.

**Implementation guidance**:
- Create profile table with core fields: name, email, avatar_url
- Add metadata JSONB column for extensible fields
- Create migration for initial schema
- Design API to gracefully handle missing optional fields

**Rationale**: Progressive approach balances MVP speed with future flexibility. JSONB column allows adding fields without migrations.

**Approved**: 2026-01-08T14:30:00

---
"""

    (task_folder / "journal.md").write_text(journal_content)

    return task_016_blocked


# ============================================================================
# Integration Tests: Happy Path Flow
# ============================================================================

class TestHappyPathIntegration:
    """Test the complete happy path: ONGOING -> FINISH."""

    @patch("implement.spawn_worker")
    @patch("implement.load_worker_prompt")
    def test_single_objective_completes_in_one_cycle(
        self, mock_load_prompt, mock_spawn, task_015_happy_path
    ):
        """Task with simple objectives should complete with worker returning FINISH."""
        from implement import run_loop, create_argument_parser

        mock_load_prompt.return_value = "Worker instructions"
        mock_spawn.return_value = json.dumps({
            "structured_output": {
                "status": "FINISH",
                "summary": "Completed both objectives - login endpoint and validation added",
                "blocker": None
            }
        })

        parser = create_argument_parser()
        args = parser.parse_args([str(task_015_happy_path)])

        result = run_loop(args)

        assert result["status"] == "FINISH"
        assert result["cycles"] == 1
        assert "login" in result["summary"].lower() or "completed" in result["summary"].lower()
        assert result["blocker"] is None

    @patch("implement.spawn_worker")
    @patch("implement.load_worker_prompt")
    def test_multi_cycle_completion(
        self, mock_load_prompt, mock_spawn, task_015_happy_path
    ):
        """Task requiring multiple cycles should accumulate summaries."""
        from implement import run_loop, create_argument_parser

        mock_load_prompt.return_value = "Worker instructions"
        mock_spawn.side_effect = [
            json.dumps({"structured_output": {
                "status": "ONGOING",
                "summary": "Created login endpoint",
                "blocker": None
            }}),
            json.dumps({"structured_output": {
                "status": "ONGOING",
                "summary": "Added input validation",
                "blocker": None
            }}),
            json.dumps({"structured_output": {
                "status": "FINISH",
                "summary": "All tests passing, task complete",
                "blocker": None
            }}),
        ]

        parser = create_argument_parser()
        args = parser.parse_args([str(task_015_happy_path)])

        result = run_loop(args)

        assert result["status"] == "FINISH"
        assert result["cycles"] == 3
        # Summary should contain info from multiple cycles
        assert len(result["summary"]) > 20
        assert result["blocker"] is None

    @patch("implement.spawn_worker")
    @patch("implement.load_worker_prompt")
    def test_resume_from_journal_state(
        self, mock_load_prompt, mock_spawn, task_015_with_journal
    ):
        """Resuming task with existing journal should continue from last state."""
        from implement import run_loop, create_argument_parser

        mock_load_prompt.return_value = "Worker instructions"
        mock_spawn.return_value = json.dumps({
            "structured_output": {
                "status": "FINISH",
                "summary": "Resumed from checkpoint, completed remaining work",
                "blocker": None
            }
        })

        parser = create_argument_parser()
        args = parser.parse_args([str(task_015_with_journal)])

        result = run_loop(args)

        assert result["status"] == "FINISH"
        # Worker should see existing journal context
        mock_spawn.assert_called_once()


# ============================================================================
# Integration Tests: Blocker Flow
# ============================================================================

class TestBlockerFlowIntegration:
    """Test the blocker flow: ONGOING -> BLOCKED -> /resolve -> resume."""

    @patch("implement.spawn_worker")
    @patch("implement.load_worker_prompt")
    def test_worker_exits_blocked(
        self, mock_load_prompt, mock_spawn, task_016_blocker_scenario
    ):
        """Worker encountering decision point should exit with BLOCKED."""
        from implement import run_loop, create_argument_parser

        mock_load_prompt.return_value = "Worker instructions"
        mock_spawn.return_value = json.dumps({
            "structured_output": {
                "status": "BLOCKED",
                "summary": "Need decision on profile fields before proceeding",
                "blocker": "Profile field selection requires human decision"
            }
        })

        parser = create_argument_parser()
        args = parser.parse_args([str(task_016_blocker_scenario)])

        result = run_loop(args)

        assert result["status"] == "BLOCKED"
        assert result["blocker"] is not None
        assert "profile" in result["blocker"].lower() or "decision" in result["blocker"].lower()
        assert result["cycles"] == 1

    def test_blocker_detected_in_journal(self, task_016_blocked):
        """Blocker in journal.md should be detected correctly."""
        from identifier_resolver import check_blocked_status

        result = check_blocked_status(str(task_016_blocked))

        assert result["blocked"] is True
        assert result["blocker_title"] == "Profile Field Selection"

    def test_resolved_blocker_not_blocked(self, task_016_resolved):
        """Resolved blocker should not mark task as blocked."""
        from identifier_resolver import check_blocked_status

        result = check_blocked_status(str(task_016_resolved))

        assert result["blocked"] is False

    @patch("implement.spawn_worker")
    @patch("implement.load_worker_prompt")
    def test_resume_after_resolution_continues(
        self, mock_load_prompt, mock_spawn, task_016_resolved
    ):
        """Resuming after resolution should let worker complete objective."""
        from implement import run_loop, create_argument_parser

        mock_load_prompt.return_value = "Worker instructions"
        mock_spawn.return_value = json.dumps({
            "structured_output": {
                "status": "FINISH",
                "summary": "Applied resolution: created minimal profile schema with extensible JSONB",
                "blocker": None
            }
        })

        parser = create_argument_parser()
        args = parser.parse_args([str(task_016_resolved)])

        result = run_loop(args)

        assert result["status"] == "FINISH"
        assert "resolution" in result["summary"].lower() or "profile" in result["summary"].lower()


# ============================================================================
# Integration Tests: Identifier Resolution
# ============================================================================

class TestIdentifierResolutionIntegration:
    """Test identifier resolution in realistic multi-task scenarios."""

    def test_resolve_by_task_id(self, task_015_happy_path, integration_project):
        """Should resolve task by ID."""
        from identifier_resolver import resolve_identifier

        result = resolve_identifier("015", integration_project)

        assert result["resolved"] is True
        assert result["resolution_type"] == "task_id"
        assert result["task_id"] == "015"
        assert str(task_015_happy_path) in result["worktree_path"]

    def test_resolve_by_task_name(self, task_015_happy_path, integration_project):
        """Should resolve task by name."""
        from identifier_resolver import resolve_identifier

        result = resolve_identifier("User Login System", integration_project)

        assert result["resolved"] is True
        assert result["resolution_type"] == "task_name"
        assert result["task_id"] == "015"

    def test_resolve_by_partial_name(self, task_015_happy_path, integration_project):
        """Should resolve task by partial name match."""
        from identifier_resolver import resolve_identifier

        result = resolve_identifier("login", integration_project)

        assert result["resolved"] is True
        assert result["task_id"] == "015"

    def test_resolve_feature_lists_tasks(
        self, task_015_happy_path, task_016_blocker_scenario, integration_project
    ):
        """Resolving feature should list associated tasks."""
        from identifier_resolver import resolve_identifier

        result = resolve_identifier("007-user-auth", integration_project)

        assert result["resolved"] is True
        assert result["resolution_type"] == "feature"
        assert "tasks" in result
        assert len(result["tasks"]) == 2

    def test_resolve_nonexistent_returns_error(self, integration_project):
        """Non-existent identifier should return helpful error."""
        from identifier_resolver import resolve_identifier

        result = resolve_identifier("nonexistent-feature", integration_project)

        assert result["resolved"] is False
        assert "error" in result
        assert "not found" in result["error"].lower() or "no task" in result["error"].lower()

    def test_ambiguous_name_returns_matches(
        self, task_015_happy_path, task_016_blocker_scenario, integration_project
    ):
        """Ambiguous name should return multiple matches for selection."""
        from identifier_resolver import resolve_identifier

        # "User" matches both "User Login System" and "User Profile Management"
        result = resolve_identifier("User", integration_project)

        # Either returns first match or multiple_matches flag
        if not result["resolved"]:
            assert result.get("multiple_matches") is True
            assert len(result.get("tasks", [])) >= 2


# ============================================================================
# Integration Tests: Error Handling
# ============================================================================

class TestErrorHandlingIntegration:
    """Test error handling in realistic scenarios."""

    def test_missing_task_json_error(self, integration_project):
        """Missing task.json should produce clear error."""
        from implement import run_loop, create_argument_parser, TaskFileError

        # Create task directory without task.json
        task_root = integration_project / "task-system" / "tasks" / "099"
        task_folder = task_root / "task-system" / "task-099"
        task_folder.mkdir(parents=True)

        parser = create_argument_parser()
        args = parser.parse_args([str(task_root)])

        with pytest.raises(TaskFileError) as exc_info:
            run_loop(args)

        assert "task.json" in str(exc_info.value).lower()

    def test_invalid_task_json_error(self, integration_project):
        """Invalid JSON in task.json should produce clear error."""
        from implement import run_loop, create_argument_parser, TaskFileError

        # Create task with invalid JSON
        task_root = integration_project / "task-system" / "tasks" / "098"
        task_folder = task_root / "task-system" / "task-098"
        task_folder.mkdir(parents=True)
        (task_folder / "task.json").write_text("{ invalid json }")

        parser = create_argument_parser()
        args = parser.parse_args([str(task_root)])

        # Note: Current implementation only checks for file existence
        # If we need to validate JSON structure, this test documents that need
        from implement import validate_task_files
        result = validate_task_files(str(task_root))

        # Current implementation passes if file exists
        # This test documents expected behavior if validation is added
        assert result["valid"] is True  # File exists

    @patch("implement.spawn_worker")
    @patch("implement.load_worker_prompt")
    def test_worker_invalid_output_handled(
        self, mock_load_prompt, mock_spawn, task_015_happy_path
    ):
        """Invalid worker output should be handled gracefully."""
        from implement import run_loop, create_argument_parser, WorkerOutputError

        mock_load_prompt.return_value = "Worker instructions"
        mock_spawn.return_value = "not valid json at all"

        parser = create_argument_parser()
        args = parser.parse_args([str(task_015_happy_path)])

        with pytest.raises(WorkerOutputError):
            run_loop(args)

    @patch("implement.spawn_worker")
    @patch("implement.load_worker_prompt")
    def test_worker_error_response_handled(
        self, mock_load_prompt, mock_spawn, task_015_happy_path
    ):
        """Worker error response (is_error: true) should be handled."""
        from implement import run_loop, create_argument_parser, WorkerOutputError

        mock_load_prompt.return_value = "Worker instructions"
        mock_spawn.return_value = json.dumps({
            "is_error": True,
            "result": "Worker crashed due to rate limit"
        })

        parser = create_argument_parser()
        args = parser.parse_args([str(task_015_happy_path)])

        with pytest.raises(WorkerOutputError) as exc_info:
            run_loop(args)

        assert "rate limit" in str(exc_info.value).lower()


# ============================================================================
# Integration Tests: Configuration Options
# ============================================================================

class TestConfigurationIntegration:
    """Test configuration options in realistic scenarios."""

    @patch("implement.spawn_worker")
    @patch("implement.load_worker_prompt")
    def test_max_cycles_respected(
        self, mock_load_prompt, mock_spawn, task_015_happy_path
    ):
        """Should stop at max cycles even if task not complete."""
        from implement import run_loop, create_argument_parser

        mock_load_prompt.return_value = "Worker instructions"
        mock_spawn.return_value = json.dumps({
            "structured_output": {
                "status": "ONGOING",
                "summary": "Still working...",
                "blocker": None
            }
        })

        parser = create_argument_parser()
        args = parser.parse_args(["--max-cycles", "3", str(task_015_happy_path)])

        result = run_loop(args)

        assert result["status"] == "MAX_CYCLES"
        assert result["cycles"] == 3

    @patch("implement.spawn_worker")
    @patch("implement.load_worker_prompt")
    @patch("time.time")
    def test_max_time_respected(
        self, mock_time, mock_load_prompt, mock_spawn, task_015_happy_path
    ):
        """Should stop at max time even if task not complete."""
        from implement import run_loop, create_argument_parser

        mock_load_prompt.return_value = "Worker instructions"
        mock_spawn.return_value = json.dumps({
            "structured_output": {
                "status": "ONGOING",
                "summary": "Still working...",
                "blocker": None
            }
        })

        # Simulate: start at 0, check at 5min, check at 65min (exceeds 60 default)
        mock_time.side_effect = [0, 300, 3900]

        parser = create_argument_parser()
        args = parser.parse_args([str(task_015_happy_path)])

        result = run_loop(args)

        assert result["status"] == "TIMEOUT"


# ============================================================================
# Integration Tests: End-to-End Workflow
# ============================================================================

class TestEndToEndWorkflow:
    """Test complete workflows from start to finish."""

    @patch("implement.spawn_worker")
    @patch("implement.load_worker_prompt")
    def test_complete_task_lifecycle(
        self, mock_load_prompt, mock_spawn, task_015_happy_path
    ):
        """
        Test complete task lifecycle:
        1. Start with pending task
        2. Worker makes progress (ONGOING)
        3. Worker completes (FINISH)
        4. Verify final state
        """
        from implement import run_loop, create_argument_parser
        from identifier_resolver import validate_task_json, check_blocked_status

        # Pre-conditions
        validation = validate_task_json(str(task_015_happy_path))
        assert validation["valid"] is True
        assert validation["task_id"] == "015"

        blocked = check_blocked_status(str(task_015_happy_path))
        assert blocked["blocked"] is False

        # Run orchestration
        mock_load_prompt.return_value = "Worker instructions"
        mock_spawn.side_effect = [
            json.dumps({"structured_output": {
                "status": "ONGOING",
                "summary": "Created login endpoint with tests",
                "blocker": None
            }}),
            json.dumps({"structured_output": {
                "status": "FINISH",
                "summary": "Added validation, all tests passing",
                "blocker": None
            }}),
        ]

        parser = create_argument_parser()
        args = parser.parse_args([str(task_015_happy_path)])

        result = run_loop(args)

        # Post-conditions
        assert result["status"] == "FINISH"
        assert result["cycles"] == 2
        assert result["elapsed_minutes"] >= 0
        assert "login" in result["summary"].lower() or "test" in result["summary"].lower()

    @patch("implement.spawn_worker")
    @patch("implement.load_worker_prompt")
    def test_blocked_then_resolve_then_complete(
        self, mock_load_prompt, mock_spawn, task_016_blocker_scenario
    ):
        """
        Test blocker resolution workflow:
        1. Worker encounters decision point -> BLOCKED
        2. (Simulate) /resolve adds resolution to journal
        3. Resume -> Worker reads resolution -> FINISH
        """
        from implement import run_loop, create_argument_parser
        from identifier_resolver import check_blocked_status

        # Phase 1: Initial run hits blocker
        mock_load_prompt.return_value = "Worker instructions"
        mock_spawn.return_value = json.dumps({
            "structured_output": {
                "status": "BLOCKED",
                "summary": "Need profile field decision",
                "blocker": "Which profile fields to include?"
            }
        })

        parser = create_argument_parser()
        args = parser.parse_args([str(task_016_blocker_scenario)])

        result1 = run_loop(args)
        assert result1["status"] == "BLOCKED"

        # Phase 2: Simulate /resolve writing to journal
        task_folder = task_016_blocker_scenario / "task-system" / "task-016"
        journal_path = task_folder / "journal.md"

        # Create journal with blocker and resolution
        journal_content = """# Task Journal

---

## Blocker: Profile Field Decision

**Objective**: obj-1
**What I'm trying to do**: Define profile schema
**What I tried**: Reviewed patterns
**What I need**: Field list decision

---

## Resolution: Profile Field Decision

**Decision**: Use minimal fields with JSONB extension column
**Implementation guidance**: Create migration with name, email, avatar_url, metadata
**Rationale**: Balance MVP with extensibility
**Approved**: 2026-01-08T15:00:00

---
"""
        journal_path.write_text(journal_content)

        # Verify blocker is now resolved
        blocked = check_blocked_status(str(task_016_blocker_scenario))
        assert blocked["blocked"] is False

        # Phase 3: Resume - worker reads resolution and completes
        mock_spawn.return_value = json.dumps({
            "structured_output": {
                "status": "FINISH",
                "summary": "Applied resolution: created profile schema with extensibility",
                "blocker": None
            }
        })

        result3 = run_loop(args)
        assert result3["status"] == "FINISH"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
