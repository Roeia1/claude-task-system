#!/bin/bash
#
# Scope validator hook for story isolation
#
# This script is invoked as a PreToolUse hook by the Claude CLI to enforce
# story scope during autonomous execution. It blocks access to:
# - .claude-tasks/archive/ (completed stories)
# - Other stories' files in .claude-tasks/epics/
#
# Usage: scope_validator.sh <epic_slug> <story_slug>
#
# Input: Tool input JSON is read from stdin
# Output: Exit code 0 = allowed, exit code 2 = blocked (with error message)
#

set -e

# Parse command line arguments
EPIC_SLUG="$1"
STORY_SLUG="$2"

if [ -z "$EPIC_SLUG" ] || [ -z "$STORY_SLUG" ]; then
    echo "ERROR: scope_validator.sh requires epic_slug and story_slug arguments" >&2
    exit 2
fi

# Read tool input JSON from stdin
TOOL_INPUT=$(cat)

# Extract file path from JSON using python3
# Handle both 'file_path' and 'path' field names
FILE_PATH=$(python3 -c "
import json
import sys

try:
    data = json.loads('''$TOOL_INPUT''')
    # Try file_path first (Read, Write, Edit tools)
    path = data.get('file_path') or data.get('path') or ''
    print(path)
except Exception as e:
    print('', file=sys.stdout)
    sys.exit(0)
" 2>/dev/null || echo "")

# If no path found, allow the operation (not a file operation)
if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Normalize path - remove leading ./ if present
NORM_PATH="${FILE_PATH#./}"

# Check for archive access
if [[ "$NORM_PATH" == *".claude-tasks/archive"* ]]; then
    cat >&2 <<EOF
SCOPE VIOLATION: Access to archive folder blocked

Attempted path: $FILE_PATH
Reason: The archive folder contains completed stories and is read-only during execution.

Your scope is limited to the current story:
  Epic: $EPIC_SLUG
  Story: $STORY_SLUG
  Allowed: .claude-tasks/epics/$EPIC_SLUG/stories/$STORY_SLUG/
EOF
    exit 2
fi

# Check for access to other stories in .claude-tasks/epics/
if [[ "$NORM_PATH" == *".claude-tasks/epics/"* ]]; then
    # Extract the epic and story from the path
    # Pattern: .claude-tasks/epics/<epic>/stories/<story>/...

    # Use python for reliable path parsing
    ALLOWED=$(python3 -c "
import sys

path = '''$NORM_PATH'''
allowed_epic = '''$EPIC_SLUG'''
allowed_story = '''$STORY_SLUG'''

# Parse path components
parts = path.split('/')

# Find epics index
try:
    epics_idx = parts.index('epics')
except ValueError:
    # No 'epics' in path - not a story file
    print('yes')
    sys.exit(0)

# Check if path is within allowed story
if len(parts) > epics_idx + 1:
    path_epic = parts[epics_idx + 1]
else:
    # Just epics folder itself
    print('yes')
    sys.exit(0)

# Check if this is in stories folder
if len(parts) > epics_idx + 3 and parts[epics_idx + 2] == 'stories':
    path_story = parts[epics_idx + 3]

    # Allow if matches current epic and story
    if path_epic == allowed_epic and path_story == allowed_story:
        print('yes')
    else:
        print('no')
else:
    # Not in a story folder - could be epic-level file, block to be safe
    if path_epic == allowed_epic:
        # Allow epic-level access for same epic
        print('yes')
    else:
        print('no')
" 2>/dev/null || echo "no")

    if [ "$ALLOWED" != "yes" ]; then
        cat >&2 <<EOF
SCOPE VIOLATION: Access to other story blocked

Attempted path: $FILE_PATH
Reason: Workers can only access their assigned story's files.

Your scope is limited to:
  Epic: $EPIC_SLUG
  Story: $STORY_SLUG
  Allowed: .claude-tasks/epics/$EPIC_SLUG/stories/$STORY_SLUG/

To access other stories, start a new /implement session for that story.
EOF
        exit 2
    fi
fi

# All other paths (code files, etc.) are allowed
exit 0
