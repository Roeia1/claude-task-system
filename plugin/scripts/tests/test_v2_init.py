#!/usr/bin/env python3
"""
Tests for the V2 init_structure.sh script functionality.

The init script creates the .claude-tasks/ directory structure:
- .claude-tasks/epics/
- .claude-tasks/archive/
- .claude-tasks/worktrees/
- Updates .gitignore
"""

import os
import subprocess
import tempfile
import pytest
from pathlib import Path


class TestInitStructureScript:
    """Tests for init_structure.sh script."""

    @pytest.fixture
    def temp_project(self):
        """Create a temporary project directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield Path(tmpdir)

    @pytest.fixture
    def script_path(self):
        """Path to the init_structure.sh script."""
        return Path(__file__).parent.parent.parent / "skills" / "init" / "scripts" / "init_structure.sh"

    def test_creates_claude_tasks_directory(self, temp_project, script_path):
        """Script creates .claude-tasks/ directory."""
        if not script_path.exists():
            pytest.skip("init_structure.sh not yet implemented")

        result = subprocess.run(
            ["bash", str(script_path), str(temp_project)],
            capture_output=True,
            text=True
        )

        assert result.returncode == 0, f"Script failed: {result.stderr}"
        assert (temp_project / ".claude-tasks").is_dir()

    def test_creates_epics_directory(self, temp_project, script_path):
        """Script creates .claude-tasks/epics/ directory."""
        if not script_path.exists():
            pytest.skip("init_structure.sh not yet implemented")

        subprocess.run(
            ["bash", str(script_path), str(temp_project)],
            capture_output=True,
            text=True
        )

        assert (temp_project / ".claude-tasks" / "epics").is_dir()

    def test_creates_archive_directory(self, temp_project, script_path):
        """Script creates .claude-tasks/archive/ directory."""
        if not script_path.exists():
            pytest.skip("init_structure.sh not yet implemented")

        subprocess.run(
            ["bash", str(script_path), str(temp_project)],
            capture_output=True,
            text=True
        )

        assert (temp_project / ".claude-tasks" / "archive").is_dir()

    def test_creates_worktrees_directory(self, temp_project, script_path):
        """Script creates .claude-tasks/worktrees/ directory."""
        if not script_path.exists():
            pytest.skip("init_structure.sh not yet implemented")

        subprocess.run(
            ["bash", str(script_path), str(temp_project)],
            capture_output=True,
            text=True
        )

        assert (temp_project / ".claude-tasks" / "worktrees").is_dir()

    def test_updates_gitignore_new_file(self, temp_project, script_path):
        """Script creates .gitignore with worktrees pattern if it doesn't exist."""
        if not script_path.exists():
            pytest.skip("init_structure.sh not yet implemented")

        subprocess.run(
            ["bash", str(script_path), str(temp_project)],
            capture_output=True,
            text=True
        )

        gitignore = temp_project / ".gitignore"
        assert gitignore.exists()
        content = gitignore.read_text()
        assert ".claude-tasks/worktrees/" in content

    def test_updates_gitignore_existing_file(self, temp_project, script_path):
        """Script appends to existing .gitignore."""
        if not script_path.exists():
            pytest.skip("init_structure.sh not yet implemented")

        gitignore = temp_project / ".gitignore"
        gitignore.write_text("node_modules/\n")

        subprocess.run(
            ["bash", str(script_path), str(temp_project)],
            capture_output=True,
            text=True
        )

        content = gitignore.read_text()
        assert "node_modules/" in content
        assert ".claude-tasks/worktrees/" in content

    def test_gitignore_idempotent(self, temp_project, script_path):
        """Script doesn't duplicate gitignore entries on repeated runs."""
        if not script_path.exists():
            pytest.skip("init_structure.sh not yet implemented")

        # Run twice
        subprocess.run(["bash", str(script_path), str(temp_project)], capture_output=True)
        subprocess.run(["bash", str(script_path), str(temp_project)], capture_output=True)

        gitignore = temp_project / ".gitignore"
        content = gitignore.read_text()
        assert content.count(".claude-tasks/worktrees/") == 1

    def test_script_is_idempotent(self, temp_project, script_path):
        """Script can be run multiple times safely."""
        if not script_path.exists():
            pytest.skip("init_structure.sh not yet implemented")

        # Run three times
        for _ in range(3):
            result = subprocess.run(
                ["bash", str(script_path), str(temp_project)],
                capture_output=True,
                text=True
            )
            assert result.returncode == 0

    def test_script_requires_project_root_argument(self, script_path):
        """Script fails gracefully without project root argument."""
        if not script_path.exists():
            pytest.skip("init_structure.sh not yet implemented")

        result = subprocess.run(
            ["bash", str(script_path)],
            capture_output=True,
            text=True
        )

        # Should either fail or print usage
        assert result.returncode != 0 or "usage" in result.stderr.lower() or "usage" in result.stdout.lower()

    def test_script_outputs_success_message(self, temp_project, script_path):
        """Script outputs information about what was created."""
        if not script_path.exists():
            pytest.skip("init_structure.sh not yet implemented")

        result = subprocess.run(
            ["bash", str(script_path), str(temp_project)],
            capture_output=True,
            text=True
        )

        # Should output something about creation
        output = result.stdout + result.stderr
        assert "claude-tasks" in output.lower() or "created" in output.lower() or "initialized" in output.lower()
