#!/usr/bin/env python3
"""
Scope validator hook for story isolation.

This script is invoked as a PreToolUse hook by the Claude CLI to enforce
story scope during autonomous execution. It blocks access to:
- .claude-tasks/archive/ (completed stories)
- Other stories' files in .claude-tasks/epics/

Environment variables required:
- EPIC_SLUG: The current epic identifier
- STORY_SLUG: The current story identifier

Input: Tool input JSON is read from stdin
Output: Exit code 0 = allowed, exit code 2 = blocked (with error message)
"""

import json
import os
import sys
from typing import Optional


def get_file_path_from_input(tool_input: str) -> Optional[str]:
    """Extract file path from tool input JSON."""
    try:
        data = json.loads(tool_input)
        # Try file_path first (Read, Write, Edit tools), then path
        return data.get("file_path") or data.get("path")
    except (json.JSONDecodeError, TypeError):
        return None


def normalize_path(path: str) -> str:
    """Normalize path by removing leading ./"""
    if path.startswith("./"):
        return path[2:]
    return path


def is_archive_access(path: str) -> bool:
    """Check if path attempts to access the archive folder."""
    return ".claude-tasks/archive" in path


def check_story_access(path: str, allowed_epic: str, allowed_story: str) -> bool:
    """
    Check if path is within the allowed story scope.

    Returns True if access is allowed, False if blocked.
    """
    if ".claude-tasks/epics/" not in path:
        return True

    parts = path.split("/")

    try:
        epics_idx = parts.index("epics")
    except ValueError:
        # No 'epics' in path - not a story file
        return True

    # Check if path has epic component
    if len(parts) <= epics_idx + 1:
        # Just epics folder itself
        return True

    path_epic = parts[epics_idx + 1]

    # Check if this is in stories folder
    if len(parts) > epics_idx + 3 and parts[epics_idx + 2] == "stories":
        path_story = parts[epics_idx + 3]
        # Allow if matches current epic and story
        return path_epic == allowed_epic and path_story == allowed_story
    else:
        # Not in a story folder - allow epic-level access for same epic
        return path_epic == allowed_epic


def print_scope_violation(file_path: str, epic_slug: str, story_slug: str, reason: str) -> None:
    """Print scope violation error message to stderr."""
    print(f"""SCOPE VIOLATION: {reason}

Attempted path: {file_path}

Your scope is limited to:
  Epic: {epic_slug}
  Story: {story_slug}
  Allowed: .claude-tasks/epics/{epic_slug}/stories/{story_slug}/

To access other stories, start a new /implement session for that story.""", file=sys.stderr)


def main() -> int:
    # Get epic and story from environment variables
    epic_slug = os.environ.get("EPIC_SLUG", "")
    story_slug = os.environ.get("STORY_SLUG", "")

    if not epic_slug or not story_slug:
        print("ERROR: scope_validator.py requires EPIC_SLUG and STORY_SLUG environment variables", file=sys.stderr)
        return 2

    # Read tool input JSON from stdin
    tool_input = sys.stdin.read()

    # Extract file path from JSON
    file_path = get_file_path_from_input(tool_input)

    # If no path found, allow the operation (not a file operation)
    if not file_path:
        return 0

    # Normalize path
    norm_path = normalize_path(file_path)

    # Check for archive access
    if is_archive_access(norm_path):
        print_scope_violation(
            file_path,
            epic_slug,
            story_slug,
            "Access to archive folder blocked\nReason: The archive folder contains completed stories and is read-only during execution."
        )
        return 2

    # Check for access to other stories
    if not check_story_access(norm_path, epic_slug, story_slug):
        print_scope_violation(
            file_path,
            epic_slug,
            story_slug,
            "Access to other story blocked\nReason: Workers can only access their assigned story's files."
        )
        return 2

    # All other paths (code files, etc.) are allowed
    return 0


if __name__ == "__main__":
    sys.exit(main())
