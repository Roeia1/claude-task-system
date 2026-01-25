"""
Test suite for scope_validator.py - the story isolation hook.

Tests cover:
- Archive access blocking
- Other story access blocking
- Allowed path scenarios
- Edge cases and error handling
"""

import json
import os
import subprocess
from pathlib import Path

import pytest


# Helper to run the validator script
def run_validator(epic_slug: str, story_slug: str, tool_input: dict) -> tuple[int, str, str]:
    """
    Run scope_validator.py and return (exit_code, stdout, stderr).

    Args:
        epic_slug: The allowed epic slug
        story_slug: The allowed story slug
        tool_input: The tool input dict to send as JSON via stdin

    Returns:
        Tuple of (exit_code, stdout, stderr)
    """
    script_path = Path(__file__).parent.parent / "scripts" / "scope_validator.py"

    env = os.environ.copy()
    env["SAGA_EPIC_SLUG"] = epic_slug
    env["SAGA_STORY_SLUG"] = story_slug

    result = subprocess.run(
        ["python3", str(script_path)],
        input=json.dumps(tool_input),
        capture_output=True,
        text=True,
        env=env
    )

    return result.returncode, result.stdout, result.stderr


class TestArchiveBlocking:
    """Tests for blocking access to archive folder."""

    def test_blocks_archive_read(self):
        """Blocks reading from archive folder."""
        exit_code, _, stderr = run_validator(
            "my-epic", "my-story",
            {"file_path": ".saga/archive/old-story/file.md"}
        )
        assert exit_code == 2
        assert "SCOPE VIOLATION" in stderr
        assert "archive" in stderr.lower()

    def test_blocks_archive_nested(self):
        """Blocks nested archive paths."""
        exit_code, _, stderr = run_validator(
            "my-epic", "my-story",
            {"file_path": "/project/.saga/archive/123/journal.md"}
        )
        assert exit_code == 2

    def test_blocks_archive_with_path_field(self):
        """Handles 'path' field name (not just 'file_path')."""
        exit_code, _, _ = run_validator(
            "my-epic", "my-story",
            {"path": ".saga/archive/story.md"}
        )
        assert exit_code == 2


class TestOtherStoryBlocking:
    """Tests for blocking access to other stories."""

    def test_blocks_different_story_same_epic(self):
        """Blocks access to different story in same epic."""
        exit_code, _, stderr = run_validator(
            "auth-system", "user-login",
            {"file_path": ".saga/epics/auth-system/stories/password-reset/story.md"}
        )
        assert exit_code == 2
        assert "SCOPE VIOLATION" in stderr

    def test_blocks_different_epic(self):
        """Blocks access to different epic entirely."""
        exit_code, _, stderr = run_validator(
            "auth-system", "user-login",
            {"file_path": ".saga/epics/payments/stories/checkout/task.md"}
        )
        assert exit_code == 2

    def test_blocks_different_epic_same_story_name(self):
        """Blocks even if story name matches but epic differs."""
        exit_code, _, _ = run_validator(
            "auth", "login",
            {"file_path": ".saga/epics/other-epic/stories/login/story.md"}
        )
        assert exit_code == 2


class TestAllowedPaths:
    """Tests for paths that should be allowed."""

    def test_allows_own_story_files(self):
        """Allows access to own story files."""
        exit_code, _, _ = run_validator(
            "auth-system", "user-login",
            {"file_path": ".saga/epics/auth-system/stories/user-login/story.md"}
        )
        assert exit_code == 0

    def test_allows_own_story_journal(self):
        """Allows access to own story journal."""
        exit_code, _, _ = run_validator(
            "my-epic", "my-story",
            {"file_path": ".saga/epics/my-epic/stories/my-story/journal.md"}
        )
        assert exit_code == 0

    def test_allows_code_files(self):
        """Allows access to regular code files."""
        exit_code, _, _ = run_validator(
            "any-epic", "any-story",
            {"file_path": "src/components/Login.tsx"}
        )
        assert exit_code == 0

    def test_allows_nested_code_files(self):
        """Allows access to deeply nested code files."""
        exit_code, _, _ = run_validator(
            "epic", "story",
            {"file_path": "/project/src/features/auth/components/LoginForm.tsx"}
        )
        assert exit_code == 0

    def test_allows_test_files(self):
        """Allows access to test files."""
        exit_code, _, _ = run_validator(
            "epic", "story",
            {"file_path": "tests/unit/auth.test.ts"}
        )
        assert exit_code == 0

    def test_allows_config_files(self):
        """Allows access to config files."""
        exit_code, _, _ = run_validator(
            "epic", "story",
            {"file_path": "package.json"}
        )
        assert exit_code == 0

    def test_allows_same_epic_level_files(self):
        """Allows access to epic-level files (not in stories/)."""
        exit_code, _, _ = run_validator(
            "my-epic", "my-story",
            {"file_path": ".saga/epics/my-epic/epic.md"}
        )
        assert exit_code == 0


class TestEdgeCases:
    """Tests for edge cases and error handling."""

    def test_handles_empty_input(self):
        """Handles empty JSON input gracefully."""
        exit_code, _, _ = run_validator(
            "epic", "story",
            {}
        )
        # No file_path = allowed (not a file operation)
        assert exit_code == 0

    def test_handles_no_path_fields(self):
        """Handles JSON without file_path or path fields."""
        exit_code, _, _ = run_validator(
            "epic", "story",
            {"other_field": "value"}
        )
        assert exit_code == 0

    def test_requires_environment_variables(self):
        """Requires SAGA_EPIC_SLUG and SAGA_STORY_SLUG environment variables."""
        script_path = Path(__file__).parent.parent / "scripts" / "scope_validator.py"

        # Missing environment variables
        env = os.environ.copy()
        env.pop("SAGA_EPIC_SLUG", None)
        env.pop("SAGA_STORY_SLUG", None)

        result = subprocess.run(
            ["python3", str(script_path)],
            input="{}",
            capture_output=True,
            text=True,
            env=env
        )
        assert result.returncode == 2

    def test_handles_relative_path_prefix(self):
        """Handles paths with ./ prefix."""
        exit_code, _, _ = run_validator(
            "my-epic", "my-story",
            {"file_path": "./.saga/archive/old/file.md"}
        )
        assert exit_code == 2  # Should still block archive

    def test_error_message_includes_scope_info(self):
        """Error message includes allowed scope information."""
        exit_code, _, stderr = run_validator(
            "test-epic", "test-story",
            {"file_path": ".saga/epics/other/stories/story/file.md"}
        )
        assert exit_code == 2
        assert "test-epic" in stderr
        assert "test-story" in stderr


class TestPathVariations:
    """Tests for various path formats."""

    def test_absolute_path_in_worktree(self):
        """Handles absolute paths that reference worktree."""
        exit_code, _, _ = run_validator(
            "epic", "story",
            {"file_path": "/home/user/project/.saga/epics/epic/stories/story/file.md"}
        )
        assert exit_code == 0

    def test_absolute_path_wrong_story(self):
        """Blocks absolute paths to wrong story."""
        exit_code, _, _ = run_validator(
            "epic", "story",
            {"file_path": "/home/user/project/.saga/epics/epic/stories/other/file.md"}
        )
        assert exit_code == 2

    def test_path_with_trailing_slash(self):
        """Handles paths with trailing slashes."""
        exit_code, _, _ = run_validator(
            "epic", "story",
            {"file_path": ".saga/epics/epic/stories/story/"}
        )
        assert exit_code == 0
