#!/usr/bin/env bash
#
# test-spawn-cleanup.sh - Test suite for spawn-cleanup.sh
#
# Tests all exit code scenarios for the spawn-cleanup script.
# Run this from the scripts directory or provide path to spawn-cleanup.sh.
#
# Exit Codes Tested:
#   0 - Success (TMUX pane spawned)
#   1 - Invalid arguments (missing or empty)
#   2 - Path not found
#   3 - TMUX command failed
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPAWN_SCRIPT="${SCRIPT_DIR}/spawn-cleanup.sh"

# Check if spawn-cleanup.sh exists
if [[ ! -f "$SPAWN_SCRIPT" ]]; then
    echo -e "${RED}ERROR: spawn-cleanup.sh not found at ${SPAWN_SCRIPT}${NC}"
    echo "Please ensure spawn-cleanup.sh exists in the same directory as this test script."
    exit 1
fi

# Check if spawn-cleanup.sh is executable
if [[ ! -x "$SPAWN_SCRIPT" ]]; then
    echo -e "${RED}ERROR: spawn-cleanup.sh is not executable${NC}"
    echo "Run: chmod +x ${SPAWN_SCRIPT}"
    exit 1
fi

# Test helper function
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

# Print test header
echo "========================================"
echo "Testing spawn-cleanup.sh"
echo "========================================"
echo ""

# Create a temporary directory for testing valid paths
TEST_TMP_DIR=$(mktemp -d)
trap "rm -rf ${TEST_TMP_DIR}" EXIT

# Create a temporary file (not a directory) for testing
TEST_TMP_FILE="${TEST_TMP_DIR}/not-a-directory"
touch "$TEST_TMP_FILE"

echo "--- Testing Exit Code 1: Invalid Arguments ---"
echo ""

# Test: No arguments at all
run_test "No arguments provided" 1

# Test: Only task_id, no main_repo_path
run_test "Missing main_repo_path argument" 1 "015"

# Test: Empty task_id
run_test "Empty task_id (first arg empty)" 1 "" "/tmp"

# Test: Empty main_repo_path
run_test "Empty main_repo_path (second arg empty)" 1 "015" ""

# Test: Both arguments empty
run_test "Both arguments empty" 1 "" ""

echo ""
echo "--- Testing Exit Code 2: Path Not Found ---"
echo ""

# Test: Non-existent path
run_test "Non-existent path" 2 "015" "/nonexistent/path/that/does/not/exist"

# Test: Path is a file, not a directory
run_test "Path exists but is a file, not directory" 2 "015" "$TEST_TMP_FILE"

echo ""
echo "--- Testing Exit Code 0 or 3: TMUX Behavior ---"
echo ""

# Test: Valid arguments - should exit 0 if in TMUX, exit 3 if not
# This test passes if we get either 0 or 3 depending on TMUX availability
set +e
"$SPAWN_SCRIPT" "015" "$TEST_TMP_DIR" >/dev/null 2>&1
valid_args_exit=$?
set -e

TESTS_RUN=$((TESTS_RUN + 1))

if [[ $valid_args_exit -eq 0 ]]; then
    echo -e "${GREEN}PASS${NC}: Valid arguments (exit code: 0 - TMUX pane spawned)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
elif [[ $valid_args_exit -eq 3 ]]; then
    echo -e "${GREEN}PASS${NC}: Valid arguments (exit code: 3 - TMUX not available, expected when not in TMUX)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}: Valid arguments"
    echo "       Expected exit code: 0 (in TMUX) or 3 (not in TMUX)"
    echo "       Actual exit code:   ${valid_args_exit}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "--- Testing Edge Cases ---"
echo ""

# Test: Path with spaces
SPACE_DIR="${TEST_TMP_DIR}/path with spaces"
mkdir -p "$SPACE_DIR"

set +e
"$SPAWN_SCRIPT" "015" "$SPACE_DIR" >/dev/null 2>&1
space_exit=$?
set -e

TESTS_RUN=$((TESTS_RUN + 1))

if [[ $space_exit -eq 0 ]] || [[ $space_exit -eq 3 ]]; then
    echo -e "${GREEN}PASS${NC}: Path with spaces handled correctly (exit code: ${space_exit})"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}: Path with spaces"
    echo "       Expected exit code: 0 or 3"
    echo "       Actual exit code:   ${space_exit}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test: Task ID with leading zeros
set +e
"$SPAWN_SCRIPT" "007" "$TEST_TMP_DIR" >/dev/null 2>&1
leading_zero_exit=$?
set -e

TESTS_RUN=$((TESTS_RUN + 1))

if [[ $leading_zero_exit -eq 0 ]] || [[ $leading_zero_exit -eq 3 ]]; then
    echo -e "${GREEN}PASS${NC}: Task ID with leading zeros (007) handled correctly (exit code: ${leading_zero_exit})"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}: Task ID with leading zeros (007)"
    echo "       Expected exit code: 0 or 3"
    echo "       Actual exit code:   ${leading_zero_exit}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test: Very long path
LONG_PATH="${TEST_TMP_DIR}/this/is/a/very/long/path/that/goes/on/and/on"
mkdir -p "$LONG_PATH"

set +e
"$SPAWN_SCRIPT" "015" "$LONG_PATH" >/dev/null 2>&1
long_path_exit=$?
set -e

TESTS_RUN=$((TESTS_RUN + 1))

if [[ $long_path_exit -eq 0 ]] || [[ $long_path_exit -eq 3 ]]; then
    echo -e "${GREEN}PASS${NC}: Very long path handled correctly (exit code: ${long_path_exit})"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}: Very long path"
    echo "       Expected exit code: 0 or 3"
    echo "       Actual exit code:   ${long_path_exit}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
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
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
