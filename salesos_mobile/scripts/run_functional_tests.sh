#!/bin/bash

# ============================================================================
# IRIS Mobile - Automated Functional Test Runner
# ============================================================================
# This script runs comprehensive functional tests on all screens,
# tests all interactive elements, and generates detailed reports.
#
# Usage:
#   ./scripts/run_functional_tests.sh              # Run all tests
#   ./scripts/run_functional_tests.sh --quick      # Quick smoke test only
#   ./scripts/run_functional_tests.sh --report     # Open HTML report after
#   ./scripts/run_functional_tests.sh --verbose    # Verbose output
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPORT_DIR="$PROJECT_DIR/test_reports"

cd "$PROJECT_DIR"

# Parse arguments
QUICK_MODE=false
OPEN_REPORT=false
VERBOSE=false

for arg in "$@"; do
    case $arg in
        --quick)
            QUICK_MODE=true
            ;;
        --report)
            OPEN_REPORT=true
            ;;
        --verbose)
            VERBOSE=true
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --quick     Run quick smoke tests only"
            echo "  --report    Open HTML report in browser after tests"
            echo "  --verbose   Show verbose test output"
            echo "  --help      Show this help message"
            exit 0
            ;;
    esac
done

# Header
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     IRIS Mobile - Automated Functional Test Runner          ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  Testing all screens, buttons, inputs, and interactions     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Ensure dependencies
echo -e "${BLUE}📦 Checking dependencies...${NC}"
flutter pub get > /dev/null 2>&1
echo -e "${GREEN}✓ Dependencies OK${NC}"
echo ""

# Create report directory
mkdir -p "$REPORT_DIR"

# Run tests
START_TIME=$(date +%s)

if [ "$QUICK_MODE" = true ]; then
    echo -e "${YELLOW}🚀 Running Quick Smoke Tests...${NC}"
    echo ""

    if [ "$VERBOSE" = true ]; then
        flutter test test/screens/all_screens_smoke_test.dart --reporter expanded
    else
        flutter test test/screens/all_screens_smoke_test.dart
    fi
else
    echo -e "${YELLOW}🔍 Running Full Functional Tests...${NC}"
    echo -e "${YELLOW}   Testing all screens and interactive elements...${NC}"
    echo ""

    if [ "$VERBOSE" = true ]; then
        flutter test test/automation/full_functional_test.dart --reporter expanded
    else
        flutter test test/automation/full_functional_test.dart
    fi
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Summary
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Tests completed in ${DURATION} seconds${NC}"
echo ""

# Check for report
if [ -f "$REPORT_DIR/latest.html" ]; then
    echo -e "${BLUE}📊 Reports generated:${NC}"
    echo "   HTML: $REPORT_DIR/latest.html"
    echo "   JSON: $REPORT_DIR/latest.json"
    echo ""

    # Open report if requested
    if [ "$OPEN_REPORT" = true ]; then
        echo -e "${BLUE}🌐 Opening report in browser...${NC}"
        if command -v xdg-open &> /dev/null; then
            xdg-open "$REPORT_DIR/latest.html"
        elif command -v open &> /dev/null; then
            open "$REPORT_DIR/latest.html"
        else
            echo "   Cannot open browser. View report at: $REPORT_DIR/latest.html"
        fi
    fi
fi

echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
