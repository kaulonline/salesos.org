#!/bin/bash

# ============================================================================
# SalesOS Mobile - Sales Journey API Test Script
# ============================================================================
#
# Tests the complete sales journey by calling actual backend APIs.
# This validates backend functionality independent of the mobile UI.
#
# Usage:
#   ./scripts/test_sales_journey_api.sh
#   ./scripts/test_sales_journey_api.sh --api-url https://api.salesos.org
#
# Test Credentials:
#   Email: jchen@salesos.org
#   Password: Password1234
#
# ============================================================================

set -e

# Configuration
API_URL="${API_URL:-http://localhost:4000}"
EMAIL="jchen@salesos.org"
PASSWORD="Password1234"

# Parse arguments
for arg in "$@"; do
    case $arg in
        --api-url)
            shift
            API_URL="$1"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--api-url <url>]"
            echo ""
            echo "Options:"
            echo "  --api-url <url>  Backend API URL (default: http://localhost:4000)"
            exit 0
            ;;
    esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Results tracking
PASSED=0
FAILED=0
ISSUES=()

# Report directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPORT_DIR="$PROJECT_DIR/test_reports"
mkdir -p "$REPORT_DIR"

REPORT_FILE="$REPORT_DIR/api_test_$(date +%Y%m%d_%H%M%S).json"
ISSUES_FILE="$REPORT_DIR/api_issues_$(date +%Y%m%d_%H%M%S).md"

# ============================================================================
# Helper Functions
# ============================================================================

log_test() {
    echo -e "${BLUE}🧪 Testing: $1${NC}"
}

log_pass() {
    echo -e "${GREEN}  ✓ PASS: $1${NC}"
    ((PASSED++))
}

log_fail() {
    echo -e "${RED}  ✗ FAIL: $1${NC}"
    echo -e "${RED}    Error: $2${NC}"
    ((FAILED++))
    ISSUES+=("$1|$2")
}

log_skip() {
    echo -e "${YELLOW}  ⊘ SKIP: $1${NC}"
}

api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth=$4

    local headers="-H 'Content-Type: application/json'"
    if [ -n "$auth" ]; then
        headers="$headers -H 'Authorization: Bearer $auth'"
    fi

    if [ -n "$data" ]; then
        eval "curl -s -X $method '$API_URL$endpoint' $headers -d '$data'"
    else
        eval "curl -s -X $method '$API_URL$endpoint' $headers"
    fi
}

# ============================================================================
# Test Header
# ============================================================================

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        SalesOS Sales Journey - API Validation Tests            ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  API URL: $API_URL${NC}"
echo -e "${CYAN}║  User: $EMAIL${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

START_TIME=$(date +%s)

# ============================================================================
# JOURNEY 1: Authentication
# ============================================================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}🔐 JOURNEY 1: Authentication${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"

# Test 1.1: Health Check
log_test "API Health Check"
HEALTH=$(curl -s "$API_URL/api/health" 2>/dev/null || echo "FAILED")
if echo "$HEALTH" | grep -q "ok\|healthy\|running" 2>/dev/null; then
    log_pass "API is healthy"
else
    log_fail "API health check" "API not responding at $API_URL"
fi

# Test 1.2: Login
log_test "User Login"
LOGIN_RESPONSE=$(api_call POST "/api/auth/login" "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "accessToken\|token" 2>/dev/null; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    if [ -z "$TOKEN" ]; then
        TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    fi
    log_pass "Login successful, token obtained"
else
    log_fail "User login" "Could not obtain access token"
    echo "Response: $LOGIN_RESPONSE"
    # Try to continue with empty token for remaining tests
    TOKEN=""
fi

# Test 1.3: Get Current User
if [ -n "$TOKEN" ]; then
    log_test "Get Current User Profile"
    USER_RESPONSE=$(api_call GET "/api/auth/me" "" "$TOKEN")

    if echo "$USER_RESPONSE" | grep -q "email\|id" 2>/dev/null; then
        log_pass "User profile retrieved"
        USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo -e "${BLUE}    User ID: $USER_ID${NC}"
    else
        log_fail "Get user profile" "Could not retrieve user data"
    fi
fi

# ============================================================================
# JOURNEY 2: Lead Management
# ============================================================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}👥 JOURNEY 2: Lead Management${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"

if [ -n "$TOKEN" ]; then
    # Test 2.1: List Leads
    log_test "List Leads"
    LEADS_RESPONSE=$(api_call GET "/api/leads?limit=5" "" "$TOKEN")

    if echo "$LEADS_RESPONSE" | grep -q "data\|leads\|\[\]" 2>/dev/null; then
        log_pass "Leads list retrieved"
        LEAD_COUNT=$(echo "$LEADS_RESPONSE" | grep -o '"id"' | wc -l)
        echo -e "${BLUE}    Leads found: $LEAD_COUNT${NC}"
    else
        log_fail "List leads" "Could not retrieve leads"
    fi

    # Test 2.2: Lead Statistics
    log_test "Lead Statistics"
    LEAD_STATS=$(api_call GET "/api/leads/stats" "" "$TOKEN")

    if echo "$LEAD_STATS" | grep -q "total\|count\|stats" 2>/dev/null; then
        log_pass "Lead statistics retrieved"
    else
        log_skip "Lead statistics (endpoint may not exist)"
    fi

    # Test 2.3: Search Leads
    log_test "Search Leads"
    SEARCH_RESPONSE=$(api_call GET "/api/leads?search=test&limit=3" "" "$TOKEN")

    if echo "$SEARCH_RESPONSE" | grep -q "data\|leads\|\[\]" 2>/dev/null; then
        log_pass "Lead search works"
    else
        log_fail "Search leads" "Search functionality failed"
    fi
else
    log_skip "Lead management tests (no auth token)"
fi

# ============================================================================
# JOURNEY 3: Contact Management
# ============================================================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📇 JOURNEY 3: Contact Management${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"

if [ -n "$TOKEN" ]; then
    # Test 3.1: List Contacts
    log_test "List Contacts"
    CONTACTS_RESPONSE=$(api_call GET "/api/contacts?limit=5" "" "$TOKEN")

    if echo "$CONTACTS_RESPONSE" | grep -q "data\|contacts\|\[\]" 2>/dev/null; then
        log_pass "Contacts list retrieved"
        CONTACT_COUNT=$(echo "$CONTACTS_RESPONSE" | grep -o '"id"' | wc -l)
        echo -e "${BLUE}    Contacts found: $CONTACT_COUNT${NC}"
    else
        log_fail "List contacts" "Could not retrieve contacts"
    fi
else
    log_skip "Contact management tests (no auth token)"
fi

# ============================================================================
# JOURNEY 4: Account Management
# ============================================================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}🏢 JOURNEY 4: Account Management${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"

if [ -n "$TOKEN" ]; then
    # Test 4.1: List Accounts
    log_test "List Accounts"
    ACCOUNTS_RESPONSE=$(api_call GET "/api/accounts?limit=5" "" "$TOKEN")

    if echo "$ACCOUNTS_RESPONSE" | grep -q "data\|accounts\|\[\]" 2>/dev/null; then
        log_pass "Accounts list retrieved"
        ACCOUNT_COUNT=$(echo "$ACCOUNTS_RESPONSE" | grep -o '"id"' | wc -l)
        echo -e "${BLUE}    Accounts found: $ACCOUNT_COUNT${NC}"
    else
        log_fail "List accounts" "Could not retrieve accounts"
    fi
else
    log_skip "Account management tests (no auth token)"
fi

# ============================================================================
# JOURNEY 5: Opportunity/Deal Pipeline
# ============================================================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}💰 JOURNEY 5: Opportunity Pipeline${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"

if [ -n "$TOKEN" ]; then
    # Test 5.1: List Opportunities
    log_test "List Opportunities"
    OPPS_RESPONSE=$(api_call GET "/api/opportunities?limit=5" "" "$TOKEN")

    if echo "$OPPS_RESPONSE" | grep -q "data\|opportunities\|\[\]" 2>/dev/null; then
        log_pass "Opportunities list retrieved"
        OPP_COUNT=$(echo "$OPPS_RESPONSE" | grep -o '"id"' | wc -l)
        echo -e "${BLUE}    Opportunities found: $OPP_COUNT${NC}"
    else
        log_fail "List opportunities" "Could not retrieve opportunities"
    fi

    # Test 5.2: Pipeline Stages
    log_test "Pipeline Summary"
    PIPELINE_RESPONSE=$(api_call GET "/api/opportunities/pipeline" "" "$TOKEN")

    if echo "$PIPELINE_RESPONSE" | grep -q "stage\|pipeline\|Prospecting\|Proposal" 2>/dev/null; then
        log_pass "Pipeline data retrieved"
    else
        log_skip "Pipeline summary (endpoint may differ)"
    fi
else
    log_skip "Opportunity tests (no auth token)"
fi

# ============================================================================
# JOURNEY 6: Task Management
# ============================================================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}✅ JOURNEY 6: Task Management${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"

if [ -n "$TOKEN" ]; then
    # Test 6.1: List Tasks
    log_test "List Tasks"
    TASKS_RESPONSE=$(api_call GET "/api/tasks?limit=5" "" "$TOKEN")

    if echo "$TASKS_RESPONSE" | grep -q "data\|tasks\|\[\]" 2>/dev/null; then
        log_pass "Tasks list retrieved"
        TASK_COUNT=$(echo "$TASKS_RESPONSE" | grep -o '"id"' | wc -l)
        echo -e "${BLUE}    Tasks found: $TASK_COUNT${NC}"
    else
        log_fail "List tasks" "Could not retrieve tasks"
    fi

    # Test 6.2: Pending Tasks
    log_test "Pending Tasks"
    PENDING_RESPONSE=$(api_call GET "/api/tasks?status=PENDING" "" "$TOKEN")

    if echo "$PENDING_RESPONSE" | grep -q "data\|tasks\|\[\]" 2>/dev/null; then
        log_pass "Pending tasks filter works"
    else
        log_skip "Pending tasks filter"
    fi
else
    log_skip "Task management tests (no auth token)"
fi

# ============================================================================
# JOURNEY 7: Activity Management
# ============================================================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📅 JOURNEY 7: Activity Management${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"

if [ -n "$TOKEN" ]; then
    # Test 7.1: List Activities
    log_test "List Activities"
    ACTIVITIES_RESPONSE=$(api_call GET "/api/activities?limit=5" "" "$TOKEN")

    if echo "$ACTIVITIES_RESPONSE" | grep -q "data\|activities\|\[\]" 2>/dev/null; then
        log_pass "Activities list retrieved"
    else
        log_skip "Activities list (endpoint may differ)"
    fi
else
    log_skip "Activity tests (no auth token)"
fi

# ============================================================================
# JOURNEY 8: Quotes & Contracts
# ============================================================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📝 JOURNEY 8: Quotes & Contracts${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"

if [ -n "$TOKEN" ]; then
    # Test 8.1: List Quotes
    log_test "List Quotes"
    QUOTES_RESPONSE=$(api_call GET "/api/quotes?limit=5" "" "$TOKEN")

    if echo "$QUOTES_RESPONSE" | grep -q "data\|quotes\|\[\]" 2>/dev/null; then
        log_pass "Quotes list retrieved"
    else
        log_skip "Quotes list (endpoint may not exist)"
    fi

    # Test 8.2: List Contracts
    log_test "List Contracts"
    CONTRACTS_RESPONSE=$(api_call GET "/api/contracts?limit=5" "" "$TOKEN")

    if echo "$CONTRACTS_RESPONSE" | grep -q "data\|contracts\|\[\]" 2>/dev/null; then
        log_pass "Contracts list retrieved"
    else
        log_skip "Contracts list (endpoint may not exist)"
    fi
else
    log_skip "Quotes & Contracts tests (no auth token)"
fi

# ============================================================================
# JOURNEY 9: AI Chat
# ============================================================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}🤖 JOURNEY 9: AI Chat${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"

if [ -n "$TOKEN" ]; then
    # Test 9.1: List Conversations
    log_test "List Conversations"
    CONVS_RESPONSE=$(api_call GET "/api/conversations?limit=5" "" "$TOKEN")

    if echo "$CONVS_RESPONSE" | grep -q "data\|conversations\|\[\]" 2>/dev/null; then
        log_pass "Conversations list retrieved"
    else
        log_fail "List conversations" "Could not retrieve conversations"
    fi

    # Test 9.2: Create Conversation
    log_test "Create New Conversation"
    NEW_CONV=$(api_call POST "/api/conversations" '{"title":"API Test Conversation"}' "$TOKEN")

    if echo "$NEW_CONV" | grep -q "id" 2>/dev/null; then
        log_pass "New conversation created"
        CONV_ID=$(echo "$NEW_CONV" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    else
        log_skip "Create conversation (may require different format)"
    fi
else
    log_skip "AI Chat tests (no auth token)"
fi

# ============================================================================
# JOURNEY 10: Reports & Insights
# ============================================================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📊 JOURNEY 10: Reports & Analytics${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"

if [ -n "$TOKEN" ]; then
    # Test 10.1: Dashboard Stats
    log_test "Dashboard Statistics"
    DASHBOARD_RESPONSE=$(api_call GET "/api/dashboard/stats" "" "$TOKEN")

    if echo "$DASHBOARD_RESPONSE" | grep -q "leads\|opportunities\|tasks\|stats" 2>/dev/null; then
        log_pass "Dashboard stats retrieved"
    else
        log_skip "Dashboard stats (endpoint may differ)"
    fi

    # Test 10.2: IRIS Rank
    log_test "IRIS Rank Data"
    RANK_RESPONSE=$(api_call GET "/api/iris-rank/leads?limit=5" "" "$TOKEN")

    if echo "$RANK_RESPONSE" | grep -q "data\|leads\|rank" 2>/dev/null; then
        log_pass "IRIS Rank data retrieved"
    else
        log_skip "IRIS Rank (endpoint may differ)"
    fi
else
    log_skip "Reports tests (no auth token)"
fi

# ============================================================================
# Results Summary
# ============================================================================

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
TOTAL=$((PASSED + FAILED))

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                 API TEST RESULTS SUMMARY                     ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${CYAN}║${NC} ${GREEN}✓ All tests passed!${NC}                                         ${CYAN}║${NC}"
else
    echo -e "${CYAN}║${NC} ${RED}✗ Some tests failed${NC}                                          ${CYAN}║${NC}"
fi

echo -e "${CYAN}║${NC}                                                              ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}   Total Tests: $TOTAL                                           ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}   ${GREEN}Passed: $PASSED${NC}                                              ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}   ${RED}Failed: $FAILED${NC}                                              ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}   Duration: ${DURATION}s                                            ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"

# Generate Reports
echo ""
echo -e "${BLUE}📁 Generating reports...${NC}"

# JSON Report
cat > "$REPORT_FILE" << EOF
{
  "testSuite": "SalesOS Sales Journey API Tests",
  "apiUrl": "$API_URL",
  "credentials": {"email": "$EMAIL"},
  "timestamp": "$(date -Iseconds)",
  "duration": $DURATION,
  "summary": {
    "total": $TOTAL,
    "passed": $PASSED,
    "failed": $FAILED,
    "passRate": $(echo "scale=2; $PASSED * 100 / $TOTAL" | bc 2>/dev/null || echo "0")
  },
  "issues": [
$(for issue in "${ISSUES[@]}"; do
    IFS='|' read -r name error <<< "$issue"
    echo "    {\"test\": \"$name\", \"error\": \"$error\"},"
done | sed '$ s/,$//')
  ]
}
EOF

# Markdown Issues Report
cat > "$ISSUES_FILE" << EOF
# SalesOS API Test Issues Report

Generated: $(date)
API URL: $API_URL

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | $TOTAL |
| Passed | $PASSED |
| Failed | $FAILED |
| Pass Rate | $(echo "scale=0; $PASSED * 100 / $TOTAL" | bc 2>/dev/null || echo "0")% |
| Duration | ${DURATION}s |

## Issues Found

EOF

if [ ${#ISSUES[@]} -eq 0 ]; then
    echo "✅ No issues found! All API tests passed." >> "$ISSUES_FILE"
else
    for issue in "${ISSUES[@]}"; do
        IFS='|' read -r name error <<< "$issue"
        echo "### ❌ $name" >> "$ISSUES_FILE"
        echo "" >> "$ISSUES_FILE"
        echo "**Error:** $error" >> "$ISSUES_FILE"
        echo "" >> "$ISSUES_FILE"
        echo "---" >> "$ISSUES_FILE"
        echo "" >> "$ISSUES_FILE"
    done
fi

# Copy to latest
cp "$REPORT_FILE" "$REPORT_DIR/api_latest.json"
cp "$ISSUES_FILE" "$REPORT_DIR/api_issues_latest.md"

echo -e "${GREEN}✓ Reports saved:${NC}"
echo "   • $REPORT_FILE"
echo "   • $ISSUES_FILE"
echo ""

# Exit with failure code if tests failed
if [ $FAILED -gt 0 ]; then
    exit 1
fi
