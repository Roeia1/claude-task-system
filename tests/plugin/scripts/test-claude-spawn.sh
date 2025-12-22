#!/usr/bin/env bash
#
# test-claude-spawn.sh - Test suite for claude-spawn.sh
#
# Tests all exit code scenarios for the Claude spawn script.
# Run from repo root: ./tests/plugin/scripts/test-claude-spawn.sh
#
# Exit Codes Tested:
#   0 - Success (new pane created in TMUX, old pane killed)
#   1 - Not running inside TMUX
#   2 - Invalid arguments (missing or empty path/prompt)
#   3 - Target path does not exist or is not a directory
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Get the directory where this script lives and resolve path to plugin script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
SPAWN_SCRIPT="${REPO_ROOT}/plugin/scripts/claude-spawn.sh"

# Check if claude-spawn.sh exists
if [[ ! -f "$SPAWN_SCRIPT" ]]; then
    echo -e "${RED}ERROR: claude-spawn.sh not found at ${SPAWN_SCRIPT}${NC}"
    echo "Expected location: plugin/scripts/claude-spawn.sh"
    exit 1
fi

# Check if claude-spawn.sh is executable
if [[ ! -x "$SPAWN_SCRIPT" ]]; then
    echo -e "${RED}ERROR: claude-spawn.sh is not executable${NC}"
    echo "Run: chmod +x ${SPAWN_SCRIPT}"
    exit 1
fi

# Test helper function for exact exit code match
run_test() {
    local test_name="$1"
    local expected_exit="$2"
    shift 2
    local args=("$@")

    TESTS_RUN=$((TESTS_RUN + 1))

    # Run the script and capture exit code
    set +e
    "$SPAWN_SCRIPT" "${args[@]}" >/dev/null 2>&1
    local actual_exit=$?
    set -e

    if [[ $actual_exit -eq $expected_exit ]]; then
        echo -e "${GREEN}PASS${NC}: ${test_name} (exit code: ${actual_exit})"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}FAIL${NC}: ${test_name}"
        echo "       Expected exit code: ${expected_exit}"
        echo "       Actual exit code:   ${actual_exit}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Test helper for TMUX-dependent tests (accepts exit 0 or 1)
# Exit 0 = in TMUX, new pane created and old pane killed
# Exit 1 = not in TMUX (expected when running tests outside TMUX)
run_tmux_test() {
    local test_name="$1"
    shift
    local args=("$@")

    TESTS_RUN=$((TESTS_RUN + 1))

    set +e
    "$SPAWN_SCRIPT" "${args[@]}" >/dev/null 2>&1
    local actual_exit=$?
    set -e

    if [[ $actual_exit -eq 0 ]]; then
        echo -e "${GREEN}PASS${NC}: ${test_name} (exit code: 0 - new pane created, old pane killed)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [[ $actual_exit -eq 1 ]]; then
        echo -e "${GREEN}PASS${NC}: ${test_name} (exit code: 1 - Not in TMUX, expected behavior)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}FAIL${NC}: ${test_name}"
        echo "       Expected exit code: 0 (in TMUX) or 1 (not in TMUX)"
        echo "       Actual exit code:   ${actual_exit}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Print test header
echo "========================================"
echo "Testing claude-spawn.sh"
echo "========================================"
echo ""

# Create a temporary directory for testing valid paths
TEST_TMP_DIR=$(mktemp -d)
trap "rm -rf ${TEST_TMP_DIR}" EXIT

# Create a temporary file (not a directory) for testing
TEST_TMP_FILE="${TEST_TMP_DIR}/not-a-directory"
touch "$TEST_TMP_FILE"

echo "--- Testing Exit Code 2: Invalid Arguments ---"
echo ""

# Test: No arguments at all
run_test "No arguments provided" 2

# Test: Only path, no prompt
run_test "Missing prompt argument" 2 "/tmp"

# Test: Empty path (first arg empty)
run_test "Empty path (first arg empty)" 2 "" "start task 010"

# Test: Empty prompt (second arg empty)
run_test "Empty prompt (second arg empty)" 2 "/tmp" ""

# Test: Both arguments empty
run_test "Both arguments empty" 2 "" ""

echo ""
echo "--- Testing Exit Code 3: Path Validation ---"
echo ""

# Test: Non-existent path
run_test "Non-existent path" 3 "/nonexistent/path/that/does/not/exist" "start task"

# Test: Path is a file, not a directory
run_test "Path exists but is a file, not directory" 3 "$TEST_TMP_FILE" "start task"

echo ""
echo "--- Testing Exit Code 0 or 1: TMUX Behavior ---"
echo ""

# Test: Valid arguments - should exit 0 if in TMUX, exit 1 if not
run_tmux_test "Valid path and prompt" "$TEST_TMP_DIR" "start task 010"

# Test: Simple prompt
run_tmux_test "Simple prompt" "$TEST_TMP_DIR" "hello"

echo ""
echo "--- Testing Edge Cases ---"
echo ""

# Test: Path with spaces
SPACE_DIR="${TEST_TMP_DIR}/path with spaces"
mkdir -p "$SPACE_DIR"
run_tmux_test "Path with spaces" "$SPACE_DIR" "start task 010"

# Test: Prompt with quotes
run_tmux_test "Prompt with double quotes" "$TEST_TMP_DIR" 'start task 010 "with quotes"'

# Test: Prompt with single quotes
run_tmux_test "Prompt with single quotes" "$TEST_TMP_DIR" "start task 010 'with quotes'"

# Test: Prompt with special shell characters
run_tmux_test "Prompt with special characters (&, |, ;)" "$TEST_TMP_DIR" "start task && do something | else"

# Test: Prompt with newlines (should be handled)
run_tmux_test "Prompt with multiword" "$TEST_TMP_DIR" "start task 010 and continue working"

# Test: Very long path
LONG_PATH="${TEST_TMP_DIR}/this/is/a/very/long/path/that/goes/on/and/on"
mkdir -p "$LONG_PATH"
run_tmux_test "Very long path" "$LONG_PATH" "start task"

# Test: Path with special characters (but valid for filesystem)
SPECIAL_DIR="${TEST_TMP_DIR}/path-with_special.chars"
mkdir -p "$SPECIAL_DIR"
run_tmux_test "Path with special chars (dash, underscore, dot)" "$SPECIAL_DIR" "start task"

# Test: Path with single quotes (tests shell escaping)
QUOTE_DIR="${TEST_TMP_DIR}/path'with'quotes"
mkdir -p "$QUOTE_DIR"
run_tmux_test "Path with single quotes" "$QUOTE_DIR" "start task"

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
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
