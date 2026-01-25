#!/usr/bin/env python3
"""
V2 Identifier Resolution for Epic and Story lookup.

This module resolves flexible identifiers to epic slugs or story metadata
for the Task System V2 (.claude-tasks/) structure.

Usage:
    # Resolve a story (default)
    python identifier_resolver_v2.py "user-login" --project-root /path/to/project

    # Resolve an epic
    python identifier_resolver_v2.py "auth" --type epic --project-root /path/to/project

Output:
    JSON object with:
    - resolved: true/false
    - epic/story: object with metadata (if single match)
    - epics/stories: array (if multiple matches)
    - error: string (if no match)
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict

import frontmatter


def extract_context(body: str, max_length: int = 300) -> str:
    """Extract context section from story body, truncated to max_length."""
    # Look for ## Context section
    context_match = re.search(r'##\s*Context\s*\n+([\s\S]*?)(?=\n##|\Z)', body, re.IGNORECASE)
    if context_match:
        context = context_match.group(1).strip()
        if len(context) > max_length:
            return context[:max_length - 3] + "..."
        return context
    return ""


# ============================================================================
# Epic Resolution
# ============================================================================

def resolve_epic(query: str, project_root: Path) -> Dict[str, Any]:
    """
    Resolve an identifier as an epic slug.

    Epic resolution only uses folder names in .claude-tasks/epics/,
    never reads epic.md files.

    Args:
        query: The identifier to resolve (potential epic slug)
        project_root: Path to the project root

    Returns:
        Dict with resolved status and epic data or error
    """
    epics_dir = project_root / ".claude-tasks" / "epics"

    if not epics_dir.exists():
        return {
            "resolved": False,
            "error": f"No .claude-tasks/epics/ directory found"
        }

    # List all epic folders
    epic_slugs = [
        d.name for d in epics_dir.iterdir()
        if d.is_dir()
    ]

    if not epic_slugs:
        return {
            "resolved": False,
            "error": f"No epics found matching '{query}'"
        }

    # Normalize query for matching
    query_normalized = query.lower().replace("_", "-")

    # Find matches
    matches = []
    for slug in epic_slugs:
        slug_normalized = slug.lower()

        # Exact match
        if slug_normalized == query_normalized:
            return {
                "resolved": True,
                "epic": {"slug": slug}
            }

        # Partial match
        if query_normalized in slug_normalized or slug_normalized in query_normalized:
            matches.append({"slug": slug})

    if len(matches) == 1:
        return {
            "resolved": True,
            "epic": matches[0]
        }
    elif len(matches) > 1:
        return {
            "resolved": False,
            "epics": matches
        }
    else:
        return {
            "resolved": False,
            "error": f"No epic found matching '{query}'"
        }


# ============================================================================
# Story Resolution
# ============================================================================

def resolve_story(query: str, project_root: Path) -> Dict[str, Any]:
    """
    Resolve an identifier as a story slug or title.

    Story resolution reads YAML front matter from story.md files
    to match on slug and title fields.

    Args:
        query: The identifier to resolve (potential story slug or title)
        project_root: Path to the project root

    Returns:
        Dict with resolved status and story data (slug, title, status, epic_slug) or error.
    """
    epics_dir = project_root / ".claude-tasks" / "epics"

    if not epics_dir.exists():
        return {
            "resolved": False,
            "error": f"No .claude-tasks/epics/ directory found"
        }

    # Normalize query for matching
    query_normalized = query.lower().replace("-", " ").replace("_", " ")

    matches = []

    # Search all epics for stories
    for epic_dir in epics_dir.iterdir():
        if not epic_dir.is_dir():
            continue

        epic_slug = epic_dir.name
        stories_dir = epic_dir / "stories"

        if not stories_dir.exists():
            continue

        # Search all stories in this epic
        for story_dir in stories_dir.iterdir():
            if not story_dir.is_dir():
                continue

            story_md = story_dir / "story.md"
            if not story_md.exists():
                continue

            try:
                content = story_md.read_text(encoding="utf-8")
                post = frontmatter.loads(content)
                metadata = post.metadata
                body = post.content

                story_slug = metadata.get("slug", story_dir.name)
                title = metadata.get("title", "")
                status = metadata.get("status", "")

                story_data = {
                    "slug": story_slug,
                    "title": title,
                    "status": status,
                    "context": extract_context(body),
                    "epic_slug": epic_slug
                }

                # Normalize for matching
                slug_normalized = story_slug.lower().replace("-", " ").replace("_", " ")
                title_normalized = title.lower().replace("-", " ").replace("_", " ")

                # Exact match on slug
                if slug_normalized == query_normalized:
                    return {
                        "resolved": True,
                        "story": story_data
                    }

                # Fuzzy match
                if (query_normalized in slug_normalized or
                    slug_normalized in query_normalized or
                    query_normalized in title_normalized or
                    title_normalized in query_normalized):
                    matches.append(story_data)

            except Exception:
                # Skip stories with invalid files
                continue

    if len(matches) == 1:
        return {
            "resolved": True,
            "story": matches[0]
        }
    elif len(matches) > 1:
        return {
            "resolved": False,
            "stories": matches
        }
    else:
        return {
            "resolved": False,
            "error": f"No story found matching '{query}'"
        }


# ============================================================================
# Main Entry Point
# ============================================================================

def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Resolve epic or story identifiers"
    )
    parser.add_argument(
        "query",
        help="The identifier to resolve (epic slug, story slug, or story title)"
    )
    parser.add_argument(
        "--type",
        choices=["epic", "story"],
        default="story",
        help="Type of identifier to resolve (default: story)"
    )
    parser.add_argument(
        "--project-root",
        required=True,
        help="Path to the project root containing .claude-tasks/"
    )

    args = parser.parse_args()

    project_root = Path(args.project_root)

    if args.type == "epic":
        result = resolve_epic(args.query, project_root)
    else:
        result = resolve_story(args.query, project_root)

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
