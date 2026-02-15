#!/bin/bash

# ============================================================================
# SalesOS Mobile - Human-Like E2E Test Runner
# ============================================================================
#
# This script runs the human-like E2E tests that mimic real user behavior.
# The tests simulate actual user interactions: tapping, typing, scrolling.
#
# Usage:
#   ./scripts/run_human_e2e.sh                     # Run on Chrome (headless)
#   ./scripts/run_human_e2e.sh --chrome            # Run on Chrome (visible)
#   ./scripts/run_human_e2e.sh --device <id>       # Run on device/emulator
#   ./scripts/run_human_e2e.sh --web-renderer html # Use HTML renderer for web
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
SCREENSHOT_DIR="$PROJECT_DIR/test_reports/screenshots"
FLUTTER_BIN="${HOME}/flutter/bin/flutter"

cd "$PROJECT_DIR"

# Parse arguments
DEVICE_ID=""
USE_CHROME=false
HEADLESS=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --device|-d)
            shift
            DEVICE_ID="$1"
            shift
            ;;
        --chrome)
            USE_CHROME=true
            HEADLESS=false
            shift
            ;;
        --headless)
            HEADLESS=true
            shift
            ;;
        --help|-h)
            echo ""
            echo "SalesOS Mobile Human-Like E2E Test Runner"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --device <id>       Run on specific device (use 'flutter devices' to list)"
            echo "  --chrome            Run on Chrome browser (requires chromedriver)"
            echo "  --headless          Run in headless mode with xvfb"
            echo "  --help              Show this help message"
            echo ""
            echo "Test Credentials:"
            echo "  Email: jchen@salesos.org"
            echo "  Password: Password1234"
            echo ""
            echo "Examples:"
            echo "  $0                        # Run on headless Chrome"
            echo "  $0 --chrome               # Run on visible Chrome"
            echo "  $0 --device iPhone14      # Run on iOS simulator"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Header
echo ""
echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║        SalesOS Mobile - Human-Like E2E Test Runner                 ║${NC}"
echo -e "${MAGENTA}╠══════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${MAGENTA}║  This test mimics REAL human behavior:                          ║${NC}"
echo -e "${MAGENTA}║    • Launch app and watch splash screen                         ║${NC}"
echo -e "${MAGENTA}║    • Type email and password like a person would                ║${NC}"
echo -e "${MAGENTA}║    • Navigate by tapping on text and buttons                    ║${NC}"
echo -e "${MAGENTA}║    • Scroll through lists                                       ║${NC}"
echo -e "${MAGENTA}║    • Capture screenshots at each step                           ║${NC}"
echo -e "${MAGENTA}║                                                                  ║${NC}"
echo -e "${MAGENTA}║  Credentials: jchen@salesos.org / Password1234               ║${NC}"
echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create directories
mkdir -p "$REPORT_DIR"
mkdir -p "$SCREENSHOT_DIR"

# Check dependencies
echo -e "${BLUE}📦 Checking dependencies...${NC}"
$FLUTTER_BIN pub get > /dev/null 2>&1
echo -e "${GREEN}✓ Dependencies OK${NC}"
echo ""

# List available devices
echo -e "${BLUE}📱 Available devices:${NC}"
$FLUTTER_BIN devices
echo ""

# Determine device and build arguments
DEVICE_ARG=""

if [ -n "$DEVICE_ID" ]; then
    DEVICE_ARG="-d $DEVICE_ID"
    echo -e "${YELLOW}🎯 Running on device: $DEVICE_ID${NC}"
elif [ "$USE_CHROME" = true ]; then
    DEVICE_ARG="-d chrome"
    echo -e "${YELLOW}🌐 Running on Chrome${NC}"
    echo -e "${YELLOW}   Note: Requires chromedriver running on port 4444${NC}"
else
    echo -e "${RED}❌ No device specified${NC}"
    echo ""
    echo "Please specify a device to run tests on:"
    echo "  $0 --device <device_id>     # iOS/Android device or simulator"
    echo "  $0 --chrome                 # Chrome browser (requires chromedriver)"
    echo ""
    echo "Available devices:"
    $FLUTTER_BIN devices
    exit 1
fi

echo ""

# Start time
START_TIME=$(date +%s)

echo -e "${CYAN}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🚀 Starting Human-Like E2E Tests...${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${MAGENTA}User Journey Steps:${NC}"
echo -e "${MAGENTA}  1. 📱 Launch app${NC}"
echo -e "${MAGENTA}  2. ⏳ Wait for splash screen${NC}"
echo -e "${MAGENTA}  3. 🔐 Enter login credentials${NC}"
echo -e "${MAGENTA}  4. 📊 Navigate to Dashboard${NC}"
echo -e "${MAGENTA}  5. 👥 Browse Leads${NC}"
echo -e "${MAGENTA}  6. 🏢 Browse Accounts${NC}"
echo -e "${MAGENTA}  7. 💰 View Deals${NC}"
echo -e "${MAGENTA}  8. ✅ Check Tasks${NC}"
echo -e "${MAGENTA}  9. 🤖 Test AI Chat${NC}"
echo -e "${MAGENTA} 10. ⚙️  Check Settings${NC}"
echo ""

# Run integration tests with flutter drive
echo -e "${BLUE}Running tests...${NC}"
echo ""

# Use flutter drive for integration tests (captures screenshots)
$FLUTTER_BIN drive \
    --driver=test_driver/integration_test.dart \
    --target=integration_test/human_e2e_test.dart \
    $DEVICE_ARG \
    2>&1 | tee "$REPORT_DIR/test_output.log"

TEST_EXIT_CODE=${PIPESTATUS[0]}

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${CYAN}══════════════════════════════════════════════════════════════════${NC}"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Human E2E Tests PASSED in ${DURATION} seconds${NC}"
else
    echo -e "${RED}❌ Human E2E Tests FAILED after ${DURATION} seconds${NC}"
fi

echo ""

# Show report locations
echo -e "${BLUE}📊 Reports:${NC}"
echo "   • Test Output: $REPORT_DIR/test_output.log"

if [ -f "$REPORT_DIR/human_e2e_latest.json" ]; then
    echo "   • JSON Report: $REPORT_DIR/human_e2e_latest.json"
fi

if [ -f "$REPORT_DIR/human_e2e_issues_latest.md" ]; then
    echo "   • Issues Report: $REPORT_DIR/human_e2e_issues_latest.md"

    # Show quick summary
    if command -v jq &> /dev/null && [ -f "$REPORT_DIR/human_e2e_latest.json" ]; then
        echo ""
        echo -e "${BLUE}📋 Quick Summary:${NC}"
        jq -r '.summary | "   Steps: \(.passedSteps)/\(.totalSteps) passed (\(.passRate | floor)%)\n   Issues: \(.issuesFound) found"' "$REPORT_DIR/human_e2e_latest.json" 2>/dev/null || true
    fi
fi

if [ -d "$SCREENSHOT_DIR" ] && [ "$(ls -A $SCREENSHOT_DIR 2>/dev/null)" ]; then
    echo "   • Screenshots: $SCREENSHOT_DIR/"
    SCREENSHOT_COUNT=$(ls -1 "$SCREENSHOT_DIR" 2>/dev/null | wc -l)
    echo "     ($SCREENSHOT_COUNT screenshots captured)"
fi

echo ""
echo -e "${CYAN}══════════════════════════════════════════════════════════════════${NC}"

exit $TEST_EXIT_CODE
