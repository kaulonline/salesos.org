#!/bin/bash

# ============================================================================
# IRIS Mobile - Test Runner Script
# ============================================================================
# Usage:
#   ./scripts/run_tests.sh              # Run all tests
#   ./scripts/run_tests.sh unit         # Run unit tests only
#   ./scripts/run_tests.sh widget       # Run widget tests only
#   ./scripts/run_tests.sh integration  # Run integration tests
#   ./scripts/run_tests.sh smoke        # Run smoke tests
#   ./scripts/run_tests.sh coverage     # Run with coverage report
#   ./scripts/run_tests.sh golden       # Update golden files
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   IRIS Mobile Test Runner${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Function to run tests
run_tests() {
    local test_type=$1
    local start_time=$(date +%s)

    case $test_type in
        "unit")
            echo -e "${YELLOW}Running Unit Tests...${NC}"
            flutter test test/helpers/ test/widgets/ --reporter expanded
            ;;
        "widget")
            echo -e "${YELLOW}Running Widget Tests...${NC}"
            flutter test test/widgets/ --reporter expanded
            ;;
        "screen"|"screens")
            echo -e "${YELLOW}Running Screen Tests...${NC}"
            flutter test test/screens/ --reporter expanded
            ;;
        "smoke")
            echo -e "${YELLOW}Running Smoke Tests...${NC}"
            flutter test test/screens/all_screens_smoke_test.dart --reporter expanded
            ;;
        "integration")
            echo -e "${YELLOW}Running Integration Tests...${NC}"
            flutter test integration_test/ --reporter expanded
            ;;
        "coverage")
            echo -e "${YELLOW}Running Tests with Coverage...${NC}"
            flutter test --coverage --reporter expanded
            echo -e "${GREEN}Coverage report generated at: coverage/lcov.info${NC}"

            # Generate HTML report if lcov is available
            if command -v genhtml &> /dev/null; then
                genhtml coverage/lcov.info -o coverage/html
                echo -e "${GREEN}HTML coverage report at: coverage/html/index.html${NC}"
            fi
            ;;
        "golden")
            echo -e "${YELLOW}Updating Golden Files...${NC}"
            flutter test --update-goldens
            ;;
        "all"|"")
            echo -e "${YELLOW}Running All Tests...${NC}"
            flutter test --reporter expanded
            ;;
        *)
            echo -e "${RED}Unknown test type: $test_type${NC}"
            echo "Usage: $0 [unit|widget|screen|smoke|integration|coverage|golden|all]"
            exit 1
            ;;
    esac

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}   Tests completed in ${duration}s${NC}"
    echo -e "${GREEN}============================================${NC}"
}

# Function to check dependencies
check_dependencies() {
    echo -e "${BLUE}Checking dependencies...${NC}"

    # Check if Flutter is installed
    if ! command -v flutter &> /dev/null; then
        echo -e "${RED}Flutter is not installed or not in PATH${NC}"
        exit 1
    fi

    # Get dependencies
    flutter pub get

    echo -e "${GREEN}Dependencies OK${NC}"
    echo ""
}

# Main execution
check_dependencies

# Run requested tests
TEST_TYPE=${1:-"all"}
run_tests "$TEST_TYPE"
