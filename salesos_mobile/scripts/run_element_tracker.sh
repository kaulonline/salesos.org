#!/bin/bash

# ============================================================================
# IRIS Mobile - Comprehensive Element Tracker
# ============================================================================
#
# Tests EVERY interactive element on EVERY screen:
# - Buttons (Elevated, Text, Outlined, Icon, FAB)
# - Text Fields
# - Switches & Checkboxes
# - List Items
# - Navigation elements
# - Chips, Dropdowns, Menus
#
# Usage:
#   ./scripts/run_element_tracker.sh ios       # Run on iOS Simulator
#   ./scripts/run_element_tracker.sh android   # Run on Android Emulator
#   ./scripts/run_element_tracker.sh <device>  # Run on specific device
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
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     IRIS Mobile - Comprehensive Element Tracker                  ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  🔍 Tests EVERY element on EVERY screen:                         ║${NC}"
echo -e "${CYAN}║                                                                  ║${NC}"
echo -e "${CYAN}║  Elements Tracked:                                               ║${NC}"
echo -e "${CYAN}║    • ElevatedButton, TextButton, OutlinedButton                 ║${NC}"
echo -e "${CYAN}║    • IconButton, FloatingActionButton                           ║${NC}"
echo -e "${CYAN}║    • TextField, TextFormField                                   ║${NC}"
echo -e "${CYAN}║    • Switch, Checkbox, Radio                                    ║${NC}"
echo -e "${CYAN}║    • ListTile, ExpansionTile, Card                              ║${NC}"
echo -e "${CYAN}║    • InkWell, GestureDetector (tappable areas)                  ║${NC}"
echo -e "${CYAN}║    • BottomNavigation, TabBar                                   ║${NC}"
echo -e "${CYAN}║    • Dropdown, PopupMenu, Chip                                  ║${NC}"
echo -e "${CYAN}║                                                                  ║${NC}"
echo -e "${CYAN}║  Screens: 30+ screens tested                                    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
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
            DEVICE=$(flutter devices 2>/dev/null | grep -i "iphone\|ipad" | head -1 | awk '{print $1}')
            DEVICE_ARG="-d $DEVICE"
            echo -e "${GREEN}✓ Using iOS: $DEVICE${NC}"
            ;;
        android|Android)
            DEVICE=$(flutter devices 2>/dev/null | grep -i "android\|emulator" | head -1 | awk '{print $1}')
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
    echo ""
    echo "Available devices:"
    $FLUTTER_BIN devices
    exit 1
fi

echo ""

START_TIME=$(date +%s)

echo -e "${MAGENTA}🔍 Starting Comprehensive Element Tracking...${NC}"
echo -e "${MAGENTA}   This will scan ALL screens and ALL elements.${NC}"
echo ""

$FLUTTER_BIN drive \
    --driver=test_driver/integration_test.dart \
    --target=integration_test/comprehensive_element_test.dart \
    $DEVICE_ARG \
    2>&1 | tee "$REPORT_DIR/element_tracker.log"

EXIT_CODE=${PIPESTATUS[0]}

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${CYAN}══════════════════════════════════════════════════════════════════${NC}"

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Element Tracking Complete in ${DURATION}s${NC}"
else
    echo -e "${YELLOW}⚠️ Completed with some issues in ${DURATION}s${NC}"
fi

echo ""
echo -e "${BLUE}📊 Reports:${NC}"
echo "   • Log: $REPORT_DIR/element_tracker.log"

if [ -f "$REPORT_DIR/element_tracking_latest.json" ]; then
    echo "   • JSON: $REPORT_DIR/element_tracking_latest.json"
fi

if [ -f "$REPORT_DIR/element_tracking_latest.md" ]; then
    echo "   • Report: $REPORT_DIR/element_tracking_latest.md"
    echo ""
    echo -e "${BLUE}Opening report...${NC}"
    open "$REPORT_DIR/element_tracking_latest.md" 2>/dev/null || true
fi

echo ""
echo -e "${CYAN}══════════════════════════════════════════════════════════════════${NC}"

exit $EXIT_CODE
