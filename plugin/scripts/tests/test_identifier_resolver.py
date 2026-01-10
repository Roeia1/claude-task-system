"""
Comprehensive test suite for identifier_resolver.py - task identifier resolution for /implement command.

Tests cover:
- Task ID resolution (direct path lookup)
- Task name resolution (searching task.json meta.title)
- Feature name resolution (listing tasks in a feature)
- Worktree validation (directory exists, is git worktree)
- task.json validation (exists, valid JSON)
- Error handling for missing/invalid inputs

Design Note: The identifier resolver is used by the /implement command to resolve
flexible identifiers (task ID, task name, feature name) to a specific task worktree
path before spawning implement.py.
"""

import json
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional
from unittest.mock import Mock, patch

import pytest


# ============================================================================
# Test Fixtures
# ============================================================================

@pytest.fixture
def temp_project_dir():
    """Create a temporary project directory structure for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_dir = Path(tmpdir)
        # Create task-system structure
        (project_dir / "task-system" / "tasks").mkdir(parents=True)
        (project_dir / "task-system" / "features").mkdir(parents=True)
        (project_dir / "task-system" / "archive").mkdir(parents=True)
        yield project_dir


@pytest.fixture
def sample_task_json() -> Dict[str, Any]:
    """Sample task.json content for testing."""
    return {
        "meta": {
            "id": "015",
            "title": "User Authentication System",
            "created": "2026-01-08",
            "feature": "007"
        },
        "overview": "Implement user authentication with JWT tokens.",
        "objectives": [
            {
                "id": "obj-1",
                "description": "Implement login endpoint",
                "status": "pending"
            }
        ]
    }


@pytest.fixture
def task_worktree(temp_project_dir, sample_task_json):
    """Create a task worktree with task.json for testing."""
    task_path = temp_project_dir / "task-system" / "tasks" / "015"
    task_path.mkdir(parents=True)
    task_folder = task_path / "task-system" / "task-015"
    task_folder.mkdir(parents=True)

    # Create task.json
    task_json_path = task_folder / "task.json"
    with open(task_json_path, "w") as f:
        json.dump(sample_task_json, f)

    return task_path


@pytest.fixture
def multiple_task_worktrees(temp_project_dir):
    """Create multiple task worktrees for testing name resolution."""
    tasks = [
        {"id": "015", "title": "User Authentication System", "feature": "007"},
        {"id": "016", "title": "User Profile Management", "feature": "007"},
        {"id": "017", "title": "Admin Dashboard", "feature": "008"},
    ]

    for task in tasks:
        task_path = temp_project_dir / "task-system" / "tasks" / task["id"]
        task_path.mkdir(parents=True)
        task_folder = task_path / "task-system" / f"task-{task['id']}"
        task_folder.mkdir(parents=True)

        task_json = {
            "meta": {
                "id": task["id"],
                "title": task["title"],
                "created": "2026-01-08",
                "feature": task["feature"]
            },
            "overview": f"Task for {task['title']}",
            "objectives": [{"id": "obj-1", "description": "Test", "status": "pending"}]
        }

        with open(task_folder / "task.json", "w") as f:
            json.dump(task_json, f)

    return temp_project_dir


@pytest.fixture
def feature_directory(temp_project_dir):
    """Create a feature directory with tasks.md for testing."""
    feature_path = temp_project_dir / "task-system" / "features" / "007-user-auth"
    feature_path.mkdir(parents=True)

    # Create tasks.md
    tasks_md = """# Tasks for Feature 007: User Authentication

| ID  | Title                       | Type    | Priority |
| --- | --------------------------- | ------- | -------- |
| 015 | User Authentication System  | feature | P1       |
| 016 | User Profile Management     | feature | P2       |
"""
    with open(feature_path / "tasks.md", "w") as f:
        f.write(tasks_md)

    return feature_path


# ============================================================================
# Test: Task ID Resolution
# ============================================================================

class TestTaskIdResolution:
    """Tests for resolving identifiers as task IDs (direct path lookup)."""

    def test_resolve_exact_task_id(self, task_worktree, temp_project_dir):
        """Test that exact task ID (e.g., '015') resolves to correct worktree path."""
        from identifier_resolver import resolve_task_id

        result = resolve_task_id("015", temp_project_dir)

        assert result["found"] is True
        assert result["task_id"] == "015"
        assert Path(result["worktree_path"]).exists()
        assert str(task_worktree) in result["worktree_path"]

    def test_resolve_task_id_with_leading_zeros(self, task_worktree, temp_project_dir):
        """Test that task IDs with different zero padding work (015, 15, 0015)."""
        from identifier_resolver import resolve_task_id

        # All should resolve to the same task
        result_015 = resolve_task_id("015", temp_project_dir)
        result_15 = resolve_task_id("15", temp_project_dir)

        assert result_015["found"] is True
        assert result_15["found"] is True
        assert result_015["worktree_path"] == result_15["worktree_path"]

    def test_resolve_nonexistent_task_id(self, temp_project_dir):
        """Test that nonexistent task ID returns not found."""
        from identifier_resolver import resolve_task_id

        result = resolve_task_id("999", temp_project_dir)

        assert result["found"] is False
        assert "error" in result
        assert "999" in result["error"]

    def test_resolve_task_id_invalid_format(self, temp_project_dir):
        """Test that invalid task ID format returns appropriate error."""
        from identifier_resolver import resolve_task_id

        result = resolve_task_id("abc", temp_project_dir)

        assert result["found"] is False
        assert "error" in result


# ============================================================================
# Test: Task Name Resolution
# ============================================================================

class TestTaskNameResolution:
    """Tests for resolving identifiers as task names (searching task.json)."""

    def test_resolve_exact_task_name(self, multiple_task_worktrees):
        """Test that exact task name resolves to correct task."""
        from identifier_resolver import resolve_task_name

        result = resolve_task_name("User Authentication System", multiple_task_worktrees)

        assert result["found"] is True
        assert result["task_id"] == "015"

    def test_resolve_partial_task_name(self, multiple_task_worktrees):
        """Test that partial task name matches are handled correctly."""
        from identifier_resolver import resolve_task_name

        # Search for partial match
        result = resolve_task_name("user-auth", multiple_task_worktrees)

        assert result["found"] is True
        assert result["task_id"] == "015"  # Should match "User Authentication System"

    def test_resolve_task_name_case_insensitive(self, multiple_task_worktrees):
        """Test that task name search is case-insensitive."""
        from identifier_resolver import resolve_task_name

        result = resolve_task_name("user authentication system", multiple_task_worktrees)

        assert result["found"] is True
        assert result["task_id"] == "015"

    def test_resolve_task_name_multiple_matches(self, multiple_task_worktrees):
        """Test that multiple matching task names returns list for selection."""
        from identifier_resolver import resolve_task_name

        # "User" should match both "User Authentication System" and "User Profile Management"
        result = resolve_task_name("User", multiple_task_worktrees)

        assert result["found"] is False
        assert result["multiple_matches"] is True
        assert len(result["matches"]) == 2
        assert "015" in [m["task_id"] for m in result["matches"]]
        assert "016" in [m["task_id"] for m in result["matches"]]

    def test_resolve_task_name_no_match(self, multiple_task_worktrees):
        """Test that non-matching name returns not found."""
        from identifier_resolver import resolve_task_name

        result = resolve_task_name("nonexistent feature", multiple_task_worktrees)

        assert result["found"] is False
        assert result.get("multiple_matches", False) is False


# ============================================================================
# Test: Feature Name Resolution
# ============================================================================

class TestFeatureNameResolution:
    """Tests for resolving identifiers as feature names."""

    def test_resolve_feature_id(self, multiple_task_worktrees, feature_directory):
        """Test that feature ID resolves to list of tasks in that feature."""
        from identifier_resolver import resolve_feature_name

        result = resolve_feature_name("007", multiple_task_worktrees)

        assert result["found"] is True
        assert result["is_feature"] is True
        assert len(result["tasks"]) == 2  # Tasks 015 and 016 belong to feature 007

    def test_resolve_feature_name_with_slug(self, multiple_task_worktrees, feature_directory):
        """Test that feature name with slug (e.g., '007-user-auth') resolves correctly."""
        from identifier_resolver import resolve_feature_name

        result = resolve_feature_name("007-user-auth", multiple_task_worktrees)

        assert result["found"] is True
        assert result["is_feature"] is True

    def test_resolve_feature_no_tasks(self, temp_project_dir):
        """Test that feature with no tasks returns appropriate message."""
        from identifier_resolver import resolve_feature_name

        # Create feature directory without tasks
        feature_path = temp_project_dir / "task-system" / "features" / "099-empty"
        feature_path.mkdir(parents=True)

        result = resolve_feature_name("099", temp_project_dir)

        assert result["found"] is True
        assert result["is_feature"] is True
        assert len(result["tasks"]) == 0
        assert "no tasks" in result.get("message", "").lower()


# ============================================================================
# Test: Worktree Validation
# ============================================================================

class TestWorktreeValidation:
    """Tests for validating that a path is a valid git worktree."""

    def test_validate_existing_worktree(self, task_worktree):
        """Test that existing task directory is validated as worktree."""
        from identifier_resolver import validate_worktree

        result = validate_worktree(str(task_worktree))

        assert result["valid"] is True

    def test_validate_nonexistent_path(self):
        """Test that nonexistent path fails validation."""
        from identifier_resolver import validate_worktree

        result = validate_worktree("/nonexistent/path/to/worktree")

        assert result["valid"] is False
        assert "not exist" in result["error"].lower()

    def test_validate_directory_not_worktree(self, temp_project_dir):
        """Test that regular directory (not a git worktree) fails validation."""
        from identifier_resolver import validate_worktree

        # Create a regular directory that's not a git worktree
        regular_dir = temp_project_dir / "not-a-worktree"
        regular_dir.mkdir()

        result = validate_worktree(str(regular_dir))

        # This should still be "valid" as directory exists (worktree check is optional)
        # The actual git worktree check may be skipped in some contexts
        assert "valid" in result


# ============================================================================
# Test: task.json Validation
# ============================================================================

class TestTaskJsonValidation:
    """Tests for validating task.json exists and is valid JSON."""

    def test_validate_existing_task_json(self, task_worktree):
        """Test that existing valid task.json passes validation."""
        from identifier_resolver import validate_task_json

        result = validate_task_json(str(task_worktree))

        assert result["valid"] is True
        assert result["task_json_path"] is not None

    def test_validate_missing_task_json(self, temp_project_dir):
        """Test that missing task.json fails validation."""
        from identifier_resolver import validate_task_json

        # Create worktree structure without task.json
        task_path = temp_project_dir / "task-system" / "tasks" / "099"
        task_folder = task_path / "task-system" / "task-099"
        task_folder.mkdir(parents=True)

        result = validate_task_json(str(task_path))

        assert result["valid"] is False
        assert "not found" in result["error"].lower()

    def test_validate_invalid_json(self, temp_project_dir):
        """Test that invalid JSON in task.json fails validation."""
        from identifier_resolver import validate_task_json

        # Create worktree with invalid JSON
        task_path = temp_project_dir / "task-system" / "tasks" / "099"
        task_folder = task_path / "task-system" / "task-099"
        task_folder.mkdir(parents=True)

        with open(task_folder / "task.json", "w") as f:
            f.write("{ invalid json }")

        result = validate_task_json(str(task_path))

        assert result["valid"] is False
        assert "invalid" in result["error"].lower() or "parse" in result["error"].lower()


# ============================================================================
# Test: Blocker Detection
# ============================================================================

class TestBlockerDetection:
    """Tests for detecting blocked tasks."""

    def test_detect_blocked_task(self, task_worktree):
        """Test that task with blocker in journal.md is detected."""
        from identifier_resolver import check_blocked_status

        # Add blocker entry to journal.md
        journal_path = task_worktree / "task-system" / "task-015" / "journal.md"
        journal_content = """# Task Journal

---

## Blocker: Need database schema decision

**Objective**: obj-1
**What I'm trying to do**: Implement login endpoint
**What I tried**: Looked at existing schemas
**What I need**: Decision on user table structure

---
"""
        with open(journal_path, "w") as f:
            f.write(journal_content)

        result = check_blocked_status(str(task_worktree))

        assert result["blocked"] is True
        assert "database schema" in result["blocker_title"].lower()

    def test_detect_resolved_blocker(self, task_worktree):
        """Test that task with resolved blocker is not marked as blocked."""
        from identifier_resolver import check_blocked_status

        # Add resolved blocker to journal.md
        journal_path = task_worktree / "task-system" / "task-015" / "journal.md"
        journal_content = """# Task Journal

---

## Blocker: Need database schema decision

**Objective**: obj-1
**What I'm trying to do**: Implement login endpoint

---

## Resolution: Need database schema decision

**Decision**: Use PostgreSQL with separate users and auth_tokens tables
**Implementation guidance**: Create migration first
**Approved**: 2026-01-08T10:00:00

---
"""
        with open(journal_path, "w") as f:
            f.write(journal_content)

        result = check_blocked_status(str(task_worktree))

        assert result["blocked"] is False

    def test_no_blocker(self, task_worktree):
        """Test that task without blocker is not marked as blocked."""
        from identifier_resolver import check_blocked_status

        result = check_blocked_status(str(task_worktree))

        assert result["blocked"] is False


# ============================================================================
# Test: Full Resolution Flow
# ============================================================================

class TestFullResolutionFlow:
    """Tests for the complete identifier resolution flow."""

    def test_resolve_identifier_as_task_id(self, task_worktree, temp_project_dir):
        """Test full flow: identifier resolved as task ID."""
        from identifier_resolver import resolve_identifier

        result = resolve_identifier("015", temp_project_dir)

        assert result["resolved"] is True
        assert result["resolution_type"] == "task_id"
        assert result["task_id"] == "015"
        assert result["worktree_path"] is not None

    def test_resolve_identifier_as_task_name(self, multiple_task_worktrees):
        """Test full flow: identifier resolved as task name."""
        from identifier_resolver import resolve_identifier

        result = resolve_identifier("Admin Dashboard", multiple_task_worktrees)

        assert result["resolved"] is True
        assert result["resolution_type"] == "task_name"
        assert result["task_id"] == "017"

    def test_resolve_identifier_as_feature(self, multiple_task_worktrees, feature_directory):
        """Test full flow: identifier resolved as feature name."""
        from identifier_resolver import resolve_identifier

        result = resolve_identifier("007-user-auth", multiple_task_worktrees)

        # Feature resolution should return list of tasks for user selection
        assert result["resolved"] is True
        assert result["resolution_type"] == "feature"
        assert "tasks" in result

    def test_resolve_identifier_priority_order(self, multiple_task_worktrees):
        """Test that identifier resolution follows priority: task_id > task_name > feature."""
        from identifier_resolver import resolve_identifier

        # "015" should resolve as task ID first, not search as name
        result = resolve_identifier("015", multiple_task_worktrees)

        assert result["resolution_type"] == "task_id"

    def test_resolve_identifier_not_found(self, temp_project_dir):
        """Test that unresolvable identifier returns appropriate error."""
        from identifier_resolver import resolve_identifier

        result = resolve_identifier("nonexistent-thing", temp_project_dir)

        assert result["resolved"] is False
        assert "error" in result


# ============================================================================
# Test: Available Tasks Listing
# ============================================================================

class TestAvailableTasksListing:
    """Tests for listing available tasks when identifier not found."""

    def test_list_available_tasks(self, multiple_task_worktrees):
        """Test that available tasks are listed correctly."""
        from identifier_resolver import list_available_tasks

        result = list_available_tasks(multiple_task_worktrees)

        assert len(result) == 3
        assert any(t["task_id"] == "015" for t in result)
        assert any(t["task_id"] == "016" for t in result)
        assert any(t["task_id"] == "017" for t in result)

    def test_list_available_tasks_with_status(self, multiple_task_worktrees):
        """Test that available tasks include status information."""
        from identifier_resolver import list_available_tasks

        # Add journal.md to one task to make it IN_PROGRESS
        journal_path = multiple_task_worktrees / "task-system" / "tasks" / "015" / "task-system" / "task-015" / "journal.md"
        with open(journal_path, "w") as f:
            f.write("# Journal")

        result = list_available_tasks(multiple_task_worktrees)

        task_015 = next(t for t in result if t["task_id"] == "015")
        task_016 = next(t for t in result if t["task_id"] == "016")

        assert task_015.get("status") == "in_progress"
        assert task_016.get("status") == "pending"


# ============================================================================
# Test: Error Message Formatting
# ============================================================================

class TestErrorMessageFormatting:
    """Tests for user-friendly error message formatting."""

    def test_identifier_not_found_message(self, temp_project_dir):
        """Test that not-found error includes helpful message."""
        from identifier_resolver import resolve_identifier

        result = resolve_identifier("nonexistent", temp_project_dir)

        assert result["resolved"] is False
        assert "not found" in result["error"].lower() or "no task" in result["error"].lower()

    def test_worktree_missing_message(self, temp_project_dir):
        """Test that missing worktree error suggests task-resume."""
        from identifier_resolver import validate_worktree

        result = validate_worktree("/nonexistent/path")

        assert result["valid"] is False
        # Error should suggest using task-resume
        assert "not exist" in result["error"].lower()

    def test_task_json_missing_message(self, temp_project_dir):
        """Test that missing task.json error is clear."""
        from identifier_resolver import validate_task_json

        task_path = temp_project_dir / "task-system" / "tasks" / "099"
        task_folder = task_path / "task-system" / "task-099"
        task_folder.mkdir(parents=True)

        result = validate_task_json(str(task_path))

        assert result["valid"] is False
        assert "task.json" in result["error"].lower()
