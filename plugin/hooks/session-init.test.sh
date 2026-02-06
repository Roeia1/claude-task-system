#!/bin/bash
# Tests for session-init.sh hook
#
# Verifies context detection for:
# - Main repo (non-worktree)
# - Flat worktree layout: .saga/worktrees/<storyId>/
# - Old nested worktree layout: .saga/worktrees/<epicSlug>/<storySlug>/ (gets full path as storyId)
#
# Usage: bash plugin/hooks/session-init.test.sh

set -euo pipefail

TESTS_PASSED=0
TESTS_FAILED=0
HOOK_SCRIPT="$(cd "$(dirname "$0")" && pwd)/session-init.sh"

# Accumulating cleanup: collect all temp dirs to clean up on EXIT
CLEANUP_DIRS=()
cleanup() {
    for dir in "${CLEANUP_DIRS[@]}"; do
        rm -rf "$dir" 2>/dev/null || true
    done
}
trap cleanup EXIT

# Helper: create a git repo with a worktree at the given relative path
setup_test_repo() {
    local test_dir="$1"
    local worktree_rel="$2"  # relative worktree path under the repo, e.g. ".saga/worktrees/my-story"

    # Create main repo
    mkdir -p "$test_dir/main"
    cd "$test_dir/main"
    git init --quiet
    git config user.email "test@test.com"
    git config user.name "Test"
    git commit --allow-empty -m "init" --quiet

    if [ -n "$worktree_rel" ]; then
        local worktree_abs="$test_dir/main/$worktree_rel"
        mkdir -p "$(dirname "$worktree_abs")"
        git worktree add "$worktree_abs" -b "test-branch-$$" --quiet 2>/dev/null
    fi
}

# Helper: assert a variable is in the env file
assert_env_contains() {
    local env_file="$1"
    local expected="$2"
    local test_name="$3"

    if grep -qF "$expected" "$env_file"; then
        echo "  PASS: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "  FAIL: $test_name"
        echo "    Expected env file to contain: $expected"
        echo "    Env file contents:"
        cat "$env_file" | sed 's/^/      /'
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Helper: assert a variable is NOT in the env file
assert_env_not_contains() {
    local env_file="$1"
    local unexpected="$2"
    local test_name="$3"

    if ! grep -qF "$unexpected" "$env_file"; then
        echo "  PASS: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "  FAIL: $test_name"
        echo "    Expected env file NOT to contain: $unexpected"
        echo "    Env file contents:"
        cat "$env_file" | sed 's/^/      /'
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Helper: assert stdout contains a string
assert_output_contains() {
    local output="$1"
    local expected="$2"
    local test_name="$3"

    if echo "$output" | grep -qF "$expected"; then
        echo "  PASS: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "  FAIL: $test_name"
        echo "    Expected output to contain: $expected"
        echo "    Output:"
        echo "$output" | sed 's/^/      /'
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# =============================================================================
# Test 1: Main repo (not a worktree) → SAGA_TASK_CONTEXT=main, no SAGA_STORY_ID
# =============================================================================
echo "Test 1: Main repo sets SAGA_TASK_CONTEXT=main"
TEST_DIR=$(mktemp -d)
CLEANUP_DIRS+=("$TEST_DIR")

setup_test_repo "$TEST_DIR" ""
ENV_FILE="$TEST_DIR/main/.test-env"
: > "$ENV_FILE"
OUTPUT=$(cd "$TEST_DIR/main" && CLAUDE_ENV_FILE="$ENV_FILE" CLAUDE_PROJECT_DIR="$TEST_DIR/main" CLAUDE_PLUGIN_ROOT="/mock" bash "$HOOK_SCRIPT" 2>&1)

assert_env_contains "$ENV_FILE" 'SAGA_TASK_CONTEXT="main"' "SAGA_TASK_CONTEXT is main"
assert_env_not_contains "$ENV_FILE" 'SAGA_STORY_ID' "SAGA_STORY_ID is not set"

# =============================================================================
# Test 2: Flat worktree layout → SAGA_TASK_CONTEXT=story-worktree, SAGA_STORY_ID set
# =============================================================================
echo "Test 2: Flat worktree (.saga/worktrees/<storyId>) sets SAGA_STORY_ID"
TEST_DIR=$(mktemp -d)
CLEANUP_DIRS+=("$TEST_DIR")

setup_test_repo "$TEST_DIR" ".saga/worktrees/auth-setup-db"
WT_DIR="$TEST_DIR/main/.saga/worktrees/auth-setup-db"
ENV_FILE="$WT_DIR/.test-env"
: > "$ENV_FILE"
OUTPUT=$(cd "$WT_DIR" && CLAUDE_ENV_FILE="$ENV_FILE" CLAUDE_PROJECT_DIR="$WT_DIR" CLAUDE_PLUGIN_ROOT="/mock" bash "$HOOK_SCRIPT" 2>&1)

assert_env_contains "$ENV_FILE" 'SAGA_TASK_CONTEXT="story-worktree"' "SAGA_TASK_CONTEXT is story-worktree"
assert_env_contains "$ENV_FILE" 'SAGA_STORY_ID="auth-setup-db"' "SAGA_STORY_ID is set to storyId"
assert_output_contains "$OUTPUT" "SAGA_STORY_ID: auth-setup-db" "stdout shows SAGA_STORY_ID"

# =============================================================================
# Test 3: Old nested worktree layout → SAGA_STORY_ID set to full path (will fail downstream)
# =============================================================================
echo "Test 3: Old nested worktree sets SAGA_STORY_ID to full after-worktrees path"
TEST_DIR=$(mktemp -d)
CLEANUP_DIRS+=("$TEST_DIR")

setup_test_repo "$TEST_DIR" ".saga/worktrees/my-epic/my-story"
WT_DIR="$TEST_DIR/main/.saga/worktrees/my-epic/my-story"
ENV_FILE="$WT_DIR/.test-env"
: > "$ENV_FILE"
OUTPUT=$(cd "$WT_DIR" && CLAUDE_ENV_FILE="$ENV_FILE" CLAUDE_PROJECT_DIR="$WT_DIR" CLAUDE_PLUGIN_ROOT="/mock" bash "$HOOK_SCRIPT" 2>&1)

assert_env_contains "$ENV_FILE" 'SAGA_TASK_CONTEXT="story-worktree"' "SAGA_TASK_CONTEXT is story-worktree"
assert_env_contains "$ENV_FILE" 'SAGA_STORY_ID="my-epic/my-story"' "SAGA_STORY_ID is set to full nested path"

# =============================================================================
# Test 4: Different storyId is extracted correctly
# =============================================================================
echo "Test 4: Different storyId is extracted correctly"
TEST_DIR=$(mktemp -d)
CLEANUP_DIRS+=("$TEST_DIR")

setup_test_repo "$TEST_DIR" ".saga/worktrees/worker-execution-pipeline"
WT_DIR="$TEST_DIR/main/.saga/worktrees/worker-execution-pipeline"
ENV_FILE="$WT_DIR/.test-env"
: > "$ENV_FILE"
OUTPUT=$(cd "$WT_DIR" && CLAUDE_ENV_FILE="$ENV_FILE" CLAUDE_PROJECT_DIR="$WT_DIR" CLAUDE_PLUGIN_ROOT="/mock" bash "$HOOK_SCRIPT" 2>&1)

assert_env_contains "$ENV_FILE" 'SAGA_STORY_ID="worker-execution-pipeline"' "SAGA_STORY_ID is worker-execution-pipeline"

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "Results: $TESTS_PASSED passed, $TESTS_FAILED failed"

if [ "$TESTS_FAILED" -gt 0 ]; then
    exit 1
fi
exit 0
