#!/usr/bin/env python3
"""
Create git worktree and draft PR for a story.

Usage:
    python create_worktree.py <epic-slug> <story-slug>

Environment:
    SAGA_PROJECT_DIR - Required: Path to the project root

Creates:
    - Git branch: story-<epic-slug>-<story-slug>
    - Worktree: .saga/worktrees/<epic-slug>/<story-slug>/
    - Draft PR with title: "Story: <epic-slug>/<story-slug>"

Output (JSON):
    {"success": true, "worktree_path": "...", "branch": "...", "pr_url": "..."}
    {"success": false, "error": "..."}
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path


def run_command(cmd: list, cwd: str = None, capture: bool = True) -> tuple:
    """Run a command and return (success, output/error)."""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=capture,
            text=True
        )
        if result.returncode == 0:
            return True, result.stdout.strip() if capture else ""
        return False, result.stderr.strip() if capture else ""
    except Exception as e:
        return False, str(e)


def output_result(success: bool, **kwargs):
    """Output JSON result and exit."""
    result = {"success": success, **kwargs}
    print(json.dumps(result))
    sys.exit(0 if success else 1)


def main():
    parser = argparse.ArgumentParser(description="Create worktree and PR for a story")
    parser.add_argument("epic_slug", help="Epic slug")
    parser.add_argument("story_slug", help="Story slug")
    args = parser.parse_args()

    epic_slug = args.epic_slug
    story_slug = args.story_slug

    # Validate SAGA_PROJECT_DIR
    project_dir = os.environ.get("SAGA_PROJECT_DIR")
    if not project_dir:
        output_result(False, error="SAGA_PROJECT_DIR environment variable is not set")

    project_path = Path(project_dir)

    # Paths
    branch_name = f"story-{story_slug}-epic-{epic_slug}"
    worktree_dir = project_path / ".saga" / "worktrees" / epic_slug / story_slug
    story_file = project_path / ".saga" / "epics" / epic_slug / "stories" / story_slug / "story.md"

    # Check if story.md exists
    if not story_file.exists():
        output_result(False, error=f"Story file not found: {story_file}")

    # Check if branch already exists
    success, _ = run_command(
        ["git", "rev-parse", "--verify", branch_name],
        cwd=str(project_path)
    )
    if success:
        output_result(False, error=f"Branch already exists: {branch_name}")

    # Check if worktree directory already exists
    if worktree_dir.exists():
        output_result(False, error=f"Worktree directory already exists: {worktree_dir}")

    # Get the main branch name
    success, main_branch = run_command(
        ["git", "symbolic-ref", "refs/remotes/origin/HEAD"],
        cwd=str(project_path)
    )
    if success:
        main_branch = main_branch.replace("refs/remotes/origin/", "")
    else:
        main_branch = "main"

    # Fetch latest main branch
    run_command(
        ["git", "fetch", "origin", main_branch],
        cwd=str(project_path)
    )

    # Create the branch from latest main
    success, error = run_command(
        ["git", "branch", branch_name, f"origin/{main_branch}"],
        cwd=str(project_path)
    )
    if not success:
        output_result(False, error=f"Failed to create branch: {error}")

    # Create parent directory for worktree
    worktree_dir.parent.mkdir(parents=True, exist_ok=True)

    # Create the worktree
    success, error = run_command(
        ["git", "worktree", "add", str(worktree_dir), branch_name],
        cwd=str(project_path)
    )
    if not success:
        output_result(False, error=f"Failed to create worktree: {error}")

    # Push the branch to origin
    success, error = run_command(
        ["git", "push", "-u", "origin", branch_name],
        cwd=str(worktree_dir)
    )
    if not success:
        output_result(False, error=f"Failed to push branch: {error}")

    # Extract story title from story.md
    story_title = story_slug
    try:
        content = story_file.read_text(encoding="utf-8")
        match = re.search(r'^title:\s*(.+)$', content, re.MULTILINE)
        if match:
            story_title = match.group(1).strip()
    except Exception:
        pass

    # Create draft PR
    pr_title = f"Story: {epic_slug}/{story_slug}"
    pr_body = f"""## Story: {story_title}

**Epic**: {epic_slug}
**Story**: {story_slug}

---

This is a draft PR for tracking story progress.

To implement this story, run:
```
/implement {story_slug}
```
"""

    success, pr_url = run_command(
        ["gh", "pr", "create", "--draft", "--title", pr_title, "--body", pr_body, "--head", branch_name],
        cwd=str(worktree_dir)
    )

    if not success or not pr_url:
        output_result(
            True,
            worktree_path=str(worktree_dir),
            branch=branch_name,
            pr_url=None,
            warning="Failed to create draft PR"
        )
    else:
        output_result(
            True,
            worktree_path=str(worktree_dir),
            branch=branch_name,
            pr_url=pr_url
        )


if __name__ == "__main__":
    main()
