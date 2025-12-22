#!/usr/bin/env bash
#
# test-detect-context-spawn.sh - Test suite for detect-context.sh spawn support
#
# Tests the new spawn functionality in detect-context.sh:
# - When in main repo with user-provided task ID, should return worktree_path
# - Worktree path should be valid and accessible
#
# Run from repo root: ./tests/plugin/skills/task-start/test-detect-context-spawn.sh
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Get the directory where this script lives and resolve path to plugin script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
DETECT_SCRIPT="${REPO_ROOT}/plugin/skills/task-start/scripts/detect-context.sh"

# Check if detect-context.sh exists
if [[ ! -f "$DETECT_SCRIPT" ]]; then
    echo -e "${RED}ERROR: detect-context.sh not found at ${DETECT_SCRIPT}${NC}"
    echo "Expected location: plugin/skills/task-start/scripts/detect-context.sh"
    exit 1
fi

# Test helper function
run_test() {
    local test_name="$1"
    local expected_status="$2"  # "ok" or "error"
    local expected_field="$3"   # field to check in JSON
    local expected_value="$4"   # expected value (regex or exact)
    shift 4
    local args=("$@")

    TESTS_RUN=$((TESTS_RUN + 1))

    # Run the script and capture output
    set +e
    local output
    output=$("$DETECT_SCRIPT" "${args[@]}" 2>&1)
    local exit_code=$?
    set -e

    # Parse JSON (simplified - just grep for the field)
    local status
    status=$(echo "$output" | grep -oP '"status":\s*"\K[^"]+' || echo "")

    local field_value
    field_value=$(echo "$output" | grep -oP "\"${expected_field}\":\s*\"\K[^\"]*" || echo "null")
    if [[ "$field_value" == "" ]]; then
        # Try null value
        field_value=$(echo "$output" | grep -oP "\"${expected_field}\":\s*\K[^,}]+" | tr -d ' ' || echo "")
    fi

    # Check status first
    if [[ "$status" != "$expected_status" ]]; then
        echo -e "${RED}FAIL${NC}: ${test_name}"
        echo "       Expected status: ${expected_status}"
        echo "       Actual status:   ${status}"
        echo "       Output: ${output}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi

    # Check expected field value
    if [[ "$expected_value" == "null" ]]; then
        if [[ "$field_value" != "null" ]] && [[ -n "$field_value" ]]; then
            echo -e "${RED}FAIL${NC}: ${test_name}"
            echo "       Expected ${expected_field}: null"
            echo "       Actual ${expected_field}: ${field_value}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        fi
    elif [[ "$expected_value" == "non-empty" ]]; then
        if [[ -z "$field_value" ]] || [[ "$field_value" == "null" ]]; then
            echo -e "${RED}FAIL${NC}: ${test_name}"
            echo "       Expected ${expected_field}: non-empty value"
            echo "       Actual ${expected_field}: ${field_value}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        fi
    elif ! echo "$field_value" | grep -qE "$expected_value"; then
        echo -e "${RED}FAIL${NC}: ${test_name}"
        echo "       Expected ${expected_field} matching: ${expected_value}"
        echo "       Actual ${expected_field}: ${field_value}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi

    echo -e "${GREEN}PASS${NC}: ${test_name} (${expected_field}: ${field_value})"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
}

# Print test header
echo "========================================"
echo "Testing detect-context.sh spawn support"
echo "========================================"
echo ""

# Determine if we're in a worktree or main repo
GIT_DIR=$(git rev-parse --git-dir 2>/dev/null)
GIT_COMMON_DIR=$(git rev-parse --git-common-dir 2>/dev/null)

if [[ "$GIT_DIR" == "$GIT_COMMON_DIR" ]]; then
    echo "Running from main repo"
    CONTEXT="main"

    echo ""
    echo "--- Testing Main Repo Context with Task ID ---"
    echo ""

    # Test: Main repo with task ID should return error with worktree_path populated
    # The new behavior should include worktree_path for spawn
    run_test "Main repo with task ID returns worktree path" "error" "worktree_path" "task-system/tasks/010" "010"

    # Test: Main repo without task ID should return error with empty worktree_path
    run_test "Main repo without task ID returns empty worktree path" "error" "worktree_path" "^$"

    # Test: Error type should still be not_in_worktree
    run_test "Main repo with task ID returns not_in_worktree error" "error" "error_type" "not_in_worktree" "010"

else
    echo "Running from worktree"
    CONTEXT="worktree"

    echo ""
    echo "--- Testing Worktree Context ---"
    echo ""

    # Test: Worktree context returns ok status
    run_test "Worktree returns ok status" "ok" "status" "ok"

    # Test: Worktree returns populated worktree_path
    run_test "Worktree returns worktree_path" "ok" "worktree_path" "non-empty"
fi

echo ""
echo "--- Testing Edge Cases ---"
echo ""

# Test: Invalid task ID format (letters)
if [[ "$CONTEXT" == "main" ]]; then
    run_test "Invalid task ID (letters) still returns error" "error" "error_type" "not_in_worktree" "abc"
fi

# Print summary
echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo "Tests run:    ${TESTS_RUN}"
echo -e "Tests passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}Note: Some tests may fail until detect-context.sh is updated to support spawn${NC}"
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
