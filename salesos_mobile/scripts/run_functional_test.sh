#!/bin/bash

# ============================================================================
# IRIS Mobile - Functional Operations Test
# ============================================================================
#
# Tests actual CRUD operations and captures REAL errors:
#
#   ✓ Login - Authentication errors
#   ✓ Create Lead - Salesforce errors, validation errors
#   ✓ Create Account - API errors
#   ✓ Create Task - Backend errors
#   ✓ AI Chat - Connection errors, response errors
#
# Error Types Detected:
#   • API errors (4xx, 5xx)
#   • Salesforce errors
#   • Network/connection errors
#   • Validation errors
#   • Timeout errors
#   • Permission errors
#
# Usage:
#   ./scripts/run_functional_test.sh ios
#   ./scripts/run_functional_test.sh android
#   ./scripts/run_functional_test.sh <device_id>
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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPORT_DIR="$PROJECT_DIR/test_reports"
FLUTTER_BIN="${HOME}/flutter/bin/flutter"

cd "$PROJECT_DIR"

# Header
echo ""
echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║     IRIS Mobile - Functional Operations Test                     ║${NC}"
echo -e "${MAGENTA}╠══════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${MAGENTA}║  🔧 Tests ACTUAL operations and captures REAL errors:            ║${NC}"
echo -e "${MAGENTA}║                                                                  ║${NC}"
echo -e "${MAGENTA}║  Operations Tested:                                              ║${NC}"
echo -e "${MAGENTA}║    • Login with real credentials                                ║${NC}"
echo -e "${MAGENTA}║    • Create Lead (catches Salesforce errors)                    ║${NC}"
echo -e "${MAGENTA}║    • Create Account (catches API errors)                        ║${NC}"
echo -e "${MAGENTA}║    • Create Task (catches backend errors)                       ║${NC}"
echo -e "${MAGENTA}║    • Send AI Message (catches response errors)                  ║${NC}"
echo -e "${MAGENTA}║                                                                  ║${NC}"
echo -e "${MAGENTA}║  Error Types Detected:                                          ║${NC}"
echo -e "${MAGENTA}║    • Salesforce errors                                          ║${NC}"
echo -e "${MAGENTA}║    • API errors (4xx, 5xx)                                      ║${NC}"
echo -e "${MAGENTA}║    • Network/connection errors                                  ║${NC}"
echo -e "${MAGENTA}║    • Validation errors                                          ║${NC}"
echo -e "${MAGENTA}║    • Timeout errors                                             ║${NC}"
echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

mkdir -p "$REPORT_DIR"

# Dependencies
echo -e "${BLUE}📦 Checking dependencies...${NC}"
$FLUTTER_BIN pub get > /dev/null 2>&1
echo -e "${GREEN}✓ Ready${NC}"
echo ""

# Device selection
DEVICE_ARG=""

if [ -n "$1" ]; then
    case "$1" in
        ios|iOS)
            open -a Simulator 2>/dev/null || true
            sleep 2
            DEVICE=$($FLUTTER_BIN devices 2>/dev/null | grep -i "iphone\|ipad" | head -1 | awk '{print $1}')
            DEVICE_ARG="-d $DEVICE"
            echo -e "${GREEN}✓ Using iOS: $DEVICE${NC}"
            ;;
        android|Android)
            DEVICE=$($FLUTTER_BIN devices 2>/dev/null | grep -i "android\|emulator" | head -1 | awk '{print $1}')
            DEVICE_ARG="-d $DEVICE"
            echo -e "${GREEN}✓ Using Android: $DEVICE${NC}"
            ;;
        *)
            DEVICE_ARG="-d $1"
            echo -e "${GREEN}✓ Using device: $1${NC}"
            ;;
    esac
else
    echo -e "${RED}❌ Please specify a device:${NC}"
    echo "  $0 ios"
    echo "  $0 android"
    echo "  $0 <device_id>"
    exit 1
fi

echo ""

START_TIME=$(date +%s)

echo -e "${CYAN}🔧 Starting Functional Operations Test...${NC}"
echo ""

$FLUTTER_BIN drive \
    --driver=test_driver/integration_test.dart \
    --target=integration_test/functional_operations_test.dart \
    $DEVICE_ARG \
    2>&1 | tee "$REPORT_DIR/functional_test.log"

EXIT_CODE=${PIPESTATUS[0]}

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${CYAN}══════════════════════════════════════════════════════════════════${NC}"

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Functional Test Complete in ${DURATION}s${NC}"
else
    echo -e "${YELLOW}⚠️ Test completed with issues in ${DURATION}s${NC}"
fi

echo ""
echo -e "${BLUE}📊 Reports:${NC}"
echo "   • Log: $REPORT_DIR/functional_test.log"

if [ -f "$REPORT_DIR/functional_test_latest.json" ]; then
    echo "   • JSON: $REPORT_DIR/functional_test_latest.json"

    # Show summary if jq available
    if command -v jq &> /dev/null; then
        echo ""
        echo -e "${BLUE}📋 Summary:${NC}"
        jq -r '.summary | "   Operations: \(.passedOperations)/\(.totalOperations) passed\n   Issues: \(.totalIssues) (\(.criticalIssues) critical, \(.highIssues) high)"' "$REPORT_DIR/functional_test_latest.json" 2>/dev/null || true
    fi
fi

if [ -f "$REPORT_DIR/functional_issues_latest.md" ]; then
    echo "   • Issues Report: $REPORT_DIR/functional_issues_latest.md"
    echo ""
    echo -e "${BLUE}Opening issues report...${NC}"
    open "$REPORT_DIR/functional_issues_latest.md" 2>/dev/null || true
fi

echo ""
echo -e "${CYAN}══════════════════════════════════════════════════════════════════${NC}"

exit $EXIT_CODE
