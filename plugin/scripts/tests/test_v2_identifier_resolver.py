#!/usr/bin/env python3
"""
Tests for the V2 identifier_resolver.py - Epic and Story resolution.

V2 identifier resolver supports:
- --type epic: Resolve epics by folder name (slug)
- --type story (default): Resolve stories by id/title from YAML front matter

Output format:
- resolved=true with epic/story object on single match
- resolved=false with epics/stories array on multiple matches
- resolved=false with error on no match
"""

import json
import os
import subprocess
import tempfile
import pytest
from pathlib import Path


# Helper to run the resolver script
def run_resolver(query: str, type_flag: str, project_root: str) -> dict:
    """Run identifier_resolver.py and return parsed JSON output."""
    script_path = Path(__file__).parent.parent / "identifier_resolver_v2.py"

    if not script_path.exists():
        pytest.skip("identifier_resolver_v2.py not yet implemented")

    cmd = ["python3", str(script_path), query, "--type", type_flag, "--project-root", project_root]
    result = subprocess.run(cmd, capture_output=True, text=True)

    # Script should always exit 0, even on no match
    assert result.returncode == 0, f"Script failed: {result.stderr}"
    return json.loads(result.stdout)


class TestEpicResolution:
    """Tests for --type epic resolution."""

    @pytest.fixture
    def temp_project(self):
        """Create a temporary project with .saga/ structure."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project = Path(tmpdir)
            epics_dir = project / ".saga" / "epics"
            epics_dir.mkdir(parents=True)
            yield project

    def test_resolve_exact_epic_slug(self, temp_project):
        """Resolves exact match on epic slug."""
        (temp_project / ".saga" / "epics" / "auth-system").mkdir()

        result = run_resolver("auth-system", "epic", str(temp_project))

        assert result["resolved"] is True
        assert result["epic"]["slug"] == "auth-system"

    def test_resolve_partial_epic_slug(self, temp_project):
        """Resolves partial match on epic slug."""
        (temp_project / ".saga" / "epics" / "user-authentication").mkdir()

        result = run_resolver("auth", "epic", str(temp_project))

        assert result["resolved"] is True
        assert result["epic"]["slug"] == "user-authentication"

    def test_resolve_epic_case_insensitive(self, temp_project):
        """Epic resolution is case-insensitive."""
        (temp_project / ".saga" / "epics" / "Auth-System").mkdir()

        result = run_resolver("auth-system", "epic", str(temp_project))

        assert result["resolved"] is True

    def test_resolve_epic_multiple_matches(self, temp_project):
        """Returns array when multiple epics match."""
        (temp_project / ".saga" / "epics" / "auth-v1").mkdir()
        (temp_project / ".saga" / "epics" / "auth-v2").mkdir()

        result = run_resolver("auth", "epic", str(temp_project))

        assert result["resolved"] is False
        assert "epics" in result
        assert len(result["epics"]) == 2
        slugs = [e["slug"] for e in result["epics"]]
        assert "auth-v1" in slugs
        assert "auth-v2" in slugs

    def test_resolve_epic_no_match(self, temp_project):
        """Returns error on no match."""
        (temp_project / ".saga" / "epics" / "payments").mkdir()

        result = run_resolver("auth", "epic", str(temp_project))

        assert result["resolved"] is False
        assert "error" in result
        assert "auth" in result["error"].lower()

    def test_resolve_epic_empty_epics_dir(self, temp_project):
        """Handles empty epics directory."""
        result = run_resolver("anything", "epic", str(temp_project))

        assert result["resolved"] is False
        assert "error" in result

    def test_resolve_epic_no_file_reading(self, temp_project):
        """Epic resolution only uses folder names, never reads files."""
        epic_dir = temp_project / ".saga" / "epics" / "auth-system"
        epic_dir.mkdir()
        # Create epic.md but with different content - shouldn't matter
        (epic_dir / "epic.md").write_text("# Different Title\n\nSome content")

        result = run_resolver("auth-system", "epic", str(temp_project))

        # Should resolve based on folder name, not file content
        assert result["resolved"] is True
        assert result["epic"]["slug"] == "auth-system"


class TestStoryResolution:
    """Tests for --type story resolution (default)."""

    @pytest.fixture
    def temp_project(self):
        """Create a temporary project with stories."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project = Path(tmpdir)
            yield project

    def create_story(self, project: Path, epic_slug: str, story_id: str, title: str, status: str = "ready"):
        """Helper to create a story.md file with YAML front matter."""
        story_dir = project / ".saga" / "epics" / epic_slug / "stories" / story_id
        story_dir.mkdir(parents=True)
        story_md = story_dir / "story.md"
        story_md.write_text(f"""---
id: {story_id}
title: {title}
status: {status}
epic: {epic_slug}
tasks: []
---

## Context

Test story context for {title}.
""")
        return story_md

    def test_resolve_story_by_exact_id(self, temp_project):
        """Resolves exact match on story slug."""
        self.create_story(temp_project, "auth", "user-login", "Implement User Login")

        result = run_resolver("user-login", "story", str(temp_project))

        assert result["resolved"] is True
        assert result["story"]["slug"] == "user-login"
        assert result["story"]["title"] == "Implement User Login"
        assert result["story"]["epic_slug"] == "auth"

    def test_resolve_story_by_partial_title(self, temp_project):
        """Resolves partial match on story title."""
        self.create_story(temp_project, "auth", "login-flow", "Implement Complete Login Flow")

        result = run_resolver("login", "story", str(temp_project))

        assert result["resolved"] is True
        assert result["story"]["slug"] == "login-flow"

    def test_resolve_story_case_insensitive(self, temp_project):
        """Story resolution is case-insensitive."""
        self.create_story(temp_project, "auth", "User-Login", "Implement User Login")

        result = run_resolver("user-login", "story", str(temp_project))

        assert result["resolved"] is True

    def test_resolve_story_multiple_matches(self, temp_project):
        """Returns array when multiple stories match."""
        self.create_story(temp_project, "auth", "user-login-v1", "User Login V1")
        self.create_story(temp_project, "payments", "user-login-v2", "User Login V2")

        result = run_resolver("user-login", "story", str(temp_project))

        assert result["resolved"] is False
        assert "stories" in result
        assert len(result["stories"]) == 2

    def test_resolve_story_returns_epic_slug(self, temp_project):
        """Story resolution includes parent epic slug."""
        self.create_story(temp_project, "auth-system", "login", "User Login")

        result = run_resolver("login", "story", str(temp_project))

        assert result["resolved"] is True
        assert result["story"]["epic_slug"] == "auth-system"

    def test_resolve_story_returns_status(self, temp_project):
        """Story resolution includes status field."""
        self.create_story(temp_project, "auth", "login", "Login", status="in-progress")

        result = run_resolver("login", "story", str(temp_project))

        assert result["resolved"] is True
        assert result["story"]["status"] == "in-progress"

    def test_resolve_story_returns_truncated_context(self, temp_project):
        """Story resolution returns context truncated to 300 chars."""
        story_dir = temp_project / ".saga" / "epics" / "auth" / "stories" / "login"
        story_dir.mkdir(parents=True)
        long_context = "A" * 500  # 500 character context
        (story_dir / "story.md").write_text(f"""---
id: login
title: Login
status: ready
epic: auth
tasks: []
---

## Context

{long_context}
""")

        result = run_resolver("login", "story", str(temp_project))

        assert result["resolved"] is True
        assert len(result["story"]["context"]) <= 300

    def test_resolve_story_no_match(self, temp_project):
        """Returns error on no match."""
        self.create_story(temp_project, "auth", "login", "Login")

        result = run_resolver("payments", "story", str(temp_project))

        assert result["resolved"] is False
        assert "error" in result
        assert "payments" in result["error"].lower()

    def test_resolve_story_default_type(self, temp_project):
        """Story is the default type when --type not specified."""
        self.create_story(temp_project, "auth", "login", "Login")

        # Run without --type flag
        script_path = Path(__file__).parent.parent / "identifier_resolver_v2.py"
        if not script_path.exists():
            pytest.skip("identifier_resolver_v2.py not yet implemented")

        cmd = ["python3", str(script_path), "login", "--project-root", str(temp_project)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        output = json.loads(result.stdout)

        assert output["resolved"] is True
        assert "story" in output


class TestCLIInterface:
    """Tests for CLI interface of identifier_resolver_v2.py."""

    @pytest.fixture
    def script_path(self):
        """Path to the identifier_resolver_v2.py script."""
        return Path(__file__).parent.parent / "identifier_resolver_v2.py"

    @pytest.fixture
    def temp_project(self):
        """Create a temporary project directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project = Path(tmpdir)
            (project / ".saga" / "epics").mkdir(parents=True)
            yield project

    def test_accepts_type_flag(self, script_path, temp_project):
        """Script accepts --type flag."""
        if not script_path.exists():
            pytest.skip("identifier_resolver_v2.py not yet implemented")

        result = subprocess.run(
            ["python3", str(script_path), "query", "--type", "epic", "--project-root", str(temp_project)],
            capture_output=True,
            text=True
        )
        assert result.returncode == 0

    def test_accepts_project_root_flag(self, script_path, temp_project):
        """Script accepts --project-root flag."""
        if not script_path.exists():
            pytest.skip("identifier_resolver_v2.py not yet implemented")

        result = subprocess.run(
            ["python3", str(script_path), "query", "--project-root", str(temp_project)],
            capture_output=True,
            text=True
        )
        assert result.returncode == 0

    def test_outputs_valid_json(self, script_path, temp_project):
        """Script always outputs valid JSON."""
        if not script_path.exists():
            pytest.skip("identifier_resolver_v2.py not yet implemented")

        result = subprocess.run(
            ["python3", str(script_path), "nonexistent", "--project-root", str(temp_project)],
            capture_output=True,
            text=True
        )
        # Should be valid JSON even on no match
        parsed = json.loads(result.stdout)
        assert "resolved" in parsed

    def test_exit_zero_on_no_match(self, script_path, temp_project):
        """Script exits 0 even when no match found."""
        if not script_path.exists():
            pytest.skip("identifier_resolver_v2.py not yet implemented")

        result = subprocess.run(
            ["python3", str(script_path), "nonexistent", "--project-root", str(temp_project)],
            capture_output=True,
            text=True
        )
        assert result.returncode == 0

    def test_type_flag_values(self, script_path, temp_project):
        """Script accepts epic and story as type values."""
        if not script_path.exists():
            pytest.skip("identifier_resolver_v2.py not yet implemented")

        for type_val in ["epic", "story"]:
            result = subprocess.run(
                ["python3", str(script_path), "query", "--type", type_val, "--project-root", str(temp_project)],
                capture_output=True,
                text=True
            )
            assert result.returncode == 0
