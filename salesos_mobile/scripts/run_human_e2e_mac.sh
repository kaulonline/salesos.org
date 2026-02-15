#!/bin/bash

# ============================================================================
# SalesOS Mobile - Human E2E Test Runner for Mac
# ============================================================================
#
# Fully automated E2E testing - no manual intervention required!
#
# Usage:
#   ./scripts/run_human_e2e_mac.sh              # Auto-detect device
#   ./scripts/run_human_e2e_mac.sh ios          # Run on iOS Simulator
#   ./scripts/run_human_e2e_mac.sh android      # Run on Android Emulator
#   ./scripts/run_human_e2e_mac.sh <device_id>  # Run on specific device
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

# Header
echo ""
echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║     SalesOS Mobile - Human-Like E2E Test (Mac)                      ║${NC}"
echo -e "${MAGENTA}╠══════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${MAGENTA}║  🤖 FULLY AUTOMATED - No manual intervention required!           ║${NC}"
echo -e "${MAGENTA}║                                                                  ║${NC}"
echo -e "${MAGENTA}║  The test will automatically:                                    ║${NC}"
echo -e "${MAGENTA}║    • Launch app and wait for splash                              ║${NC}"
echo -e "${MAGENTA}║    • Type email & password                                       ║${NC}"
echo -e "${MAGENTA}║    • Navigate through all screens                                ║${NC}"
echo -e "${MAGENTA}║    • Scroll lists, tap buttons                                   ║${NC}"
echo -e "${MAGENTA}║    • Take screenshots & capture issues                           ║${NC}"
echo -e "${MAGENTA}║                                                                  ║${NC}"
echo -e "${MAGENTA}║  Credentials: jchen@salesos.org / Password1234                ║${NC}"
echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create report directory
mkdir -p "$REPORT_DIR"
mkdir -p "$REPORT_DIR/screenshots"

# Get dependencies
echo -e "${BLUE}📦 Checking dependencies...${NC}"
flutter pub get > /dev/null 2>&1
echo -e "${GREEN}✓ Dependencies ready${NC}"
echo ""

# Determine device
DEVICE_ARG=""
TARGET_DEVICE=""

if [ -n "$1" ]; then
    case "$1" in
        ios|iOS)
            echo -e "${BLUE}🍎 Starting iOS Simulator...${NC}"
            open -a Simulator 2>/dev/null || true
            sleep 3

            # Get first available iOS simulator
            TARGET_DEVICE=$(flutter devices 2>/dev/null | grep -i "iphone\|ipad" | head -1 | awk '{print $1}')
            if [ -z "$TARGET_DEVICE" ]; then
                echo -e "${RED}❌ No iOS simulator found. Please open Simulator app first.${NC}"
                exit 1
            fi
            DEVICE_ARG="-d $TARGET_DEVICE"
            echo -e "${GREEN}✓ Using iOS: $TARGET_DEVICE${NC}"
            ;;
        android|Android)
            echo -e "${BLUE}🤖 Looking for Android emulator...${NC}"

            # Get first available Android emulator
            TARGET_DEVICE=$(flutter devices 2>/dev/null | grep -i "android\|emulator" | head -1 | awk '{print $1}')
            if [ -z "$TARGET_DEVICE" ]; then
                echo -e "${YELLOW}Starting Android emulator...${NC}"
                EMULATOR=$(flutter emulators 2>/dev/null | grep -v "^$" | tail -1 | awk '{print $1}')
                if [ -n "$EMULATOR" ]; then
                    flutter emulators --launch "$EMULATOR" &
                    sleep 15
                    TARGET_DEVICE=$(flutter devices 2>/dev/null | grep -i "android\|emulator" | head -1 | awk '{print $1}')
                fi
            fi

            if [ -z "$TARGET_DEVICE" ]; then
                echo -e "${RED}❌ No Android emulator found. Please start one first.${NC}"
                exit 1
            fi
            DEVICE_ARG="-d $TARGET_DEVICE"
            echo -e "${GREEN}✓ Using Android: $TARGET_DEVICE${NC}"
            ;;
        --help|-h)
            echo "Usage: $0 [ios|android|<device_id>]"
            echo ""
            echo "Options:"
            echo "  ios          Run on iOS Simulator"
            echo "  android      Run on Android Emulator"
            echo "  <device_id>  Run on specific device"
            echo ""
            echo "Examples:"
            echo "  $0 ios"
            echo "  $0 android"
            echo "  $0 'iPhone 15 Pro'"
            echo "  $0 emulator-5554"
            exit 0
            ;;
        *)
            # Assume it's a device ID
            DEVICE_ARG="-d $1"
            TARGET_DEVICE="$1"
            echo -e "${GREEN}✓ Using device: $1${NC}"
            ;;
    esac
else
    # Auto-detect first available device
    echo -e "${BLUE}🔍 Auto-detecting device...${NC}"
    echo ""
    flutter devices
    echo ""

    # Try iOS first
    TARGET_DEVICE=$(flutter devices 2>/dev/null | grep -i "iphone\|ipad" | head -1 | awk '{print $1}')

    # Then try Android
    if [ -z "$TARGET_DEVICE" ]; then
        TARGET_DEVICE=$(flutter devices 2>/dev/null | grep -i "android\|emulator" | head -1 | awk '{print $1}')
    fi

    if [ -z "$TARGET_DEVICE" ]; then
        echo -e "${RED}❌ No device found!${NC}"
        echo ""
        echo "Please start a simulator/emulator first:"
        echo "  • iOS: open -a Simulator"
        echo "  • Android: flutter emulators --launch <name>"
        echo ""
        echo "Or connect a physical device via USB."
        exit 1
    fi

    DEVICE_ARG="-d $TARGET_DEVICE"
    echo -e "${GREEN}✓ Auto-selected: $TARGET_DEVICE${NC}"
fi

echo ""

# Start timer
START_TIME=$(date +%s)

echo -e "${CYAN}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🚀 Starting Automated Human E2E Test...${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${MAGENTA}Automated User Journey:${NC}"
echo -e "${MAGENTA}  1. 📱 Launch app${NC}"
echo -e "${MAGENTA}  2. ⏳ Wait for splash screen${NC}"
echo -e "${MAGENTA}  3. 🔐 Enter email: jchen@salesos.org${NC}"
echo -e "${MAGENTA}  4. 🔐 Enter password: ********${NC}"
echo -e "${MAGENTA}  5. 👆 Tap Sign In button${NC}"
echo -e "${MAGENTA}  6. 📊 Verify Dashboard loads${NC}"
echo -e "${MAGENTA}  7. 👥 Navigate to Leads, scroll list${NC}"
echo -e "${MAGENTA}  8. 🏢 Navigate to Accounts${NC}"
echo -e "${MAGENTA}  9. 💰 Navigate to Deals${NC}"
echo -e "${MAGENTA} 10. ✅ Navigate to Tasks${NC}"
echo -e "${MAGENTA} 11. 🤖 Open AI Chat, type message${NC}"
echo -e "${MAGENTA} 12. ⚙️  Open Settings${NC}"
echo -e "${MAGENTA} 13. 📸 Screenshots captured at each step${NC}"
echo ""

# Run the test
echo -e "${BLUE}Running automated test...${NC}"
echo -e "${YELLOW}(Watch the simulator - it will navigate automatically!)${NC}"
echo ""

flutter drive \
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
    echo -e "${GREEN}✅ AUTOMATED TEST PASSED in ${DURATION} seconds${NC}"
else
    echo -e "${RED}❌ AUTOMATED TEST FAILED after ${DURATION} seconds${NC}"
fi

echo ""

# Show reports
echo -e "${BLUE}📊 Test Reports:${NC}"
echo "   • Test Log: $REPORT_DIR/test_output.log"

if [ -f "$REPORT_DIR/human_e2e_latest.json" ]; then
    echo "   • JSON Results: $REPORT_DIR/human_e2e_latest.json"

    # Show summary if jq available
    if command -v jq &> /dev/null; then
        echo ""
        echo -e "${BLUE}📋 Summary:${NC}"
        jq -r '.summary | "   Steps: \(.passedSteps)/\(.totalSteps) passed (\(.passRate | floor)%)\n   Issues: \(.issuesFound)"' "$REPORT_DIR/human_e2e_latest.json" 2>/dev/null || true
    fi
fi

if [ -f "$REPORT_DIR/human_e2e_issues_latest.md" ]; then
    echo "   • Issues Report: $REPORT_DIR/human_e2e_issues_latest.md"

    # Open the report automatically on Mac
    echo ""
    echo -e "${BLUE}Opening issues report...${NC}"
    open "$REPORT_DIR/human_e2e_issues_latest.md" 2>/dev/null || true
fi

echo ""
echo -e "${CYAN}══════════════════════════════════════════════════════════════════${NC}"

exit $TEST_EXIT_CODE
