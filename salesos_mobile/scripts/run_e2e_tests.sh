#!/bin/bash

# ============================================================================
# SalesOS Mobile - E2E Sales Journey Test Runner
# ============================================================================
#
# This script runs comprehensive end-to-end tests that validate the complete
# sales journey from a user's perspective.
#
# Usage:
#   ./scripts/run_e2e_tests.sh                    # Run all E2E tests
#   ./scripts/run_e2e_tests.sh --device <id>      # Run on specific device
#   ./scripts/run_e2e_tests.sh --chrome           # Run on Chrome (web)
#   ./scripts/run_e2e_tests.sh --report           # Open report after tests
#
# Test Credentials:
#   Email: jchen@salesos.org
#   Password: Password1234
#
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPORT_DIR="$PROJECT_DIR/test_reports"

cd "$PROJECT_DIR"

# Parse arguments
DEVICE_ID=""
OPEN_REPORT=false
USE_CHROME=false

for arg in "$@"; do
    case $arg in
        --device)
            shift
            DEVICE_ID="$1"
            shift
            ;;
        --chrome)
            USE_CHROME=true
            ;;
        --report)
            OPEN_REPORT=true
            ;;
        --help|-h)
            echo ""
            echo "SalesOS Mobile E2E Sales Journey Test Runner"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --device <id>  Run on specific device (use 'flutter devices' to list)"
            echo "  --chrome       Run on Chrome browser"
            echo "  --report       Open HTML report after tests"
            echo "  --help         Show this help message"
            echo ""
            echo "Test Credentials:"
            echo "  Email: jchen@salesos.org"
            echo "  Password: Password1234"
            echo ""
            exit 0
            ;;
    esac
done

# Header
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      SalesOS Mobile - E2E Sales Journey Test Runner            ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  Testing complete sales journey with real user flows        ║${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}║  Credentials: jchen@salesos.org / Password1234            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check dependencies
echo -e "${BLUE}📦 Checking dependencies...${NC}"
flutter pub get > /dev/null 2>&1
echo -e "${GREEN}✓ Dependencies OK${NC}"
echo ""

# Create report directory
mkdir -p "$REPORT_DIR"

# List available devices
echo -e "${BLUE}📱 Available devices:${NC}"
flutter devices
echo ""

# Build device argument
DEVICE_ARG=""
if [ -n "$DEVICE_ID" ]; then
    DEVICE_ARG="-d $DEVICE_ID"
    echo -e "${YELLOW}Running on device: $DEVICE_ID${NC}"
elif [ "$USE_CHROME" = true ]; then
    DEVICE_ARG="-d chrome"
    echo -e "${YELLOW}Running on Chrome browser${NC}"
fi

# Start time
START_TIME=$(date +%s)

echo ""
echo -e "${MAGENTA}🚀 Starting E2E Sales Journey Tests...${NC}"
echo -e "${MAGENTA}   This will test the complete user journey:${NC}"
echo -e "${MAGENTA}   1. Authentication Flow${NC}"
echo -e "${MAGENTA}   2. Lead Management${NC}"
echo -e "${MAGENTA}   3. Contact Management${NC}"
echo -e "${MAGENTA}   4. Account Management${NC}"
echo -e "${MAGENTA}   5. Opportunity Pipeline${NC}"
echo -e "${MAGENTA}   6. Task Management${NC}"
echo -e "${MAGENTA}   7. AI Chat${NC}"
echo -e "${MAGENTA}   8. Quotes & Contracts${NC}"
echo -e "${MAGENTA}   9. Reports & Insights${NC}"
echo -e "${MAGENTA}  10. Settings${NC}"
echo ""

# Run E2E tests
flutter test integration_test/e2e_sales_journey_test.dart $DEVICE_ARG --reporter expanded

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Results
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ E2E Tests completed in ${DURATION} seconds${NC}"
echo ""

# Show report locations
if [ -f "$REPORT_DIR/e2e_latest.json" ]; then
    echo -e "${BLUE}📊 Reports generated:${NC}"
    echo "   • JSON Report: $REPORT_DIR/e2e_latest.json"
    echo "   • Issues Report: $REPORT_DIR/e2e_issues_latest.md"
    echo ""

    # Show quick summary from JSON
    if command -v jq &> /dev/null; then
        echo -e "${BLUE}📋 Quick Summary:${NC}"
        jq -r '.summary | "   Journeys: \(.passedJourneys)/\(.totalJourneys) passed\n   Steps: \(.passedSteps)/\(.totalSteps) passed (\(.passRate | floor)%)\n   Issues: \(.totalIssues) (\(.criticalIssues) critical, \(.highIssues) high)"' "$REPORT_DIR/e2e_latest.json" 2>/dev/null || true
        echo ""
    fi

    # Open report if requested
    if [ "$OPEN_REPORT" = true ]; then
        echo -e "${BLUE}📄 Opening issues report...${NC}"
        if command -v code &> /dev/null; then
            code "$REPORT_DIR/e2e_issues_latest.md"
        elif command -v xdg-open &> /dev/null; then
            xdg-open "$REPORT_DIR/e2e_issues_latest.md"
        elif command -v open &> /dev/null; then
            open "$REPORT_DIR/e2e_issues_latest.md"
        else
            echo "   View report at: $REPORT_DIR/e2e_issues_latest.md"
        fi
    fi
fi

echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
