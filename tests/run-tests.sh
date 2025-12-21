#!/usr/bin/env bash
#
# run-tests.sh - Run all plugin tests
#
# Usage: ./tests/run-tests.sh [pattern]
#
# Examples:
#   ./tests/run-tests.sh              # Run all tests
#   ./tests/run-tests.sh task-cleanup # Run only task-cleanup tests
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Optional filter pattern
FILTER="${1:-}"

echo -e "${BLUE}========================================"
echo "Plugin Test Runner"
echo -e "========================================${NC}"
echo ""

# Find and run all test scripts
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

cd "$REPO_ROOT"

# Find all test scripts matching pattern
while IFS= read -r -d '' test_script; do
    # Skip if filter provided and doesn't match
    if [[ -n "$FILTER" ]] && [[ "$test_script" != *"$FILTER"* ]]; then
        continue
    fi

    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    relative_path="${test_script#$REPO_ROOT/}"

    echo -e "${BLUE}Running: ${relative_path}${NC}"
    echo ""

    if "$test_script"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi

    echo ""
done < <(find "$SCRIPT_DIR" -name "test-*.sh" -type f -executable -print0)

# Summary
echo -e "${BLUE}========================================"
echo "Overall Summary"
echo -e "========================================${NC}"
echo "Test suites run:    ${TESTS_TOTAL}"
echo -e "Test suites passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Test suites failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [[ $TESTS_FAILED -eq 0 ]]; then
    if [[ $TESTS_TOTAL -eq 0 ]]; then
        echo -e "${RED}No tests found!${NC}"
        exit 1
    fi
    echo -e "${GREEN}All test suites passed!${NC}"
    exit 0
else
    echo -e "${RED}Some test suites failed!${NC}"
    exit 1
fi
