#!/bin/bash
#
# End-to-End Test Runner for IRIS Sales Coaching AI
# Simulates user behavior and validates API endpoints
#

API_BASE="${API_URL:-http://localhost:4000/api}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
TOTAL=0

# Tokens
ADMIN_TOKEN=""
MANAGER_TOKEN=""
USER_TOKEN=""

echo "═══════════════════════════════════════════════════════════════"
echo "   IRIS Sales Coaching AI - End-to-End Tests"
echo "   API Base: $API_BASE"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Test helper function
run_test() {
    local name="$1"
    local category="$2"
    local method="$3"
    local endpoint="$4"
    local expected_status="$5"
    local token="$6"
    local data="$7"

    TOTAL=$((TOTAL + 1))

    local headers="-H 'Content-Type: application/json'"
    if [ -n "$token" ]; then
        headers="$headers -H 'Authorization: Bearer $token'"
    fi

    local curl_cmd="curl -s -w '\n%{http_code}' -X $method"
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi

    # Execute the request
    local response
    if [ -n "$token" ] && [ -n "$data" ]; then
        response=$(curl -s -w '\n%{http_code}' -X "$method" \
            -H 'Content-Type: application/json' \
            -H "Authorization: Bearer $token" \
            -d "$data" \
            "$API_BASE$endpoint" 2>/dev/null)
    elif [ -n "$token" ]; then
        response=$(curl -s -w '\n%{http_code}' -X "$method" \
            -H 'Content-Type: application/json' \
            -H "Authorization: Bearer $token" \
            "$API_BASE$endpoint" 2>/dev/null)
    elif [ -n "$data" ]; then
        response=$(curl -s -w '\n%{http_code}' -X "$method" \
            -H 'Content-Type: application/json' \
            -d "$data" \
            "$API_BASE$endpoint" 2>/dev/null)
    else
        response=$(curl -s -w '\n%{http_code}' -X "$method" \
            -H 'Content-Type: application/json' \
            "$API_BASE$endpoint" 2>/dev/null)
    fi

    local status_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅${NC} [$category] $name (Status: $status_code)"
        PASSED=$((PASSED + 1))
        echo "$body"
    else
        echo -e "${RED}❌${NC} [$category] $name (Expected: $expected_status, Got: $status_code)"
        FAILED=$((FAILED + 1))
        echo "   Response: $body" | head -c 200
        echo ""
    fi

    echo "$body"
}

echo -e "\n${BLUE}📋 AUTHENTICATION TESTS${NC}\n"

# Admin Login
response=$(curl -s -w '\n%{http_code}' -X POST \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@iriseller.com","password":"Password1234"}' \
    "$API_BASE/auth/login")
status=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
ADMIN_TOKEN=$(echo "$body" | jq -r '.access_token // empty')
TOTAL=$((TOTAL + 1))
if [ "$status" = "200" ] || [ "$status" = "201" ] && [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${GREEN}✅${NC} [Auth] Admin Login (Status: $status)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} [Auth] Admin Login (Status: $status)"
    FAILED=$((FAILED + 1))
fi

# Manager Login
response=$(curl -s -w '\n%{http_code}' -X POST \
    -H 'Content-Type: application/json' \
    -d '{"email":"manager@iriseller.com","password":"Password1234"}' \
    "$API_BASE/auth/login")
status=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
MANAGER_TOKEN=$(echo "$body" | jq -r '.access_token // empty')
TOTAL=$((TOTAL + 1))
if ([ "$status" = "200" ] || [ "$status" = "201" ]) && [ -n "$MANAGER_TOKEN" ]; then
    echo -e "${GREEN}✅${NC} [Auth] Manager Login (Status: $status)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} [Auth] Manager Login (Status: $status)"
    FAILED=$((FAILED + 1))
fi

# User Login
response=$(curl -s -w '\n%{http_code}' -X POST \
    -H 'Content-Type: application/json' \
    -d '{"email":"jchen@iriseller.com","password":"Password1234"}' \
    "$API_BASE/auth/login")
status=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
USER_TOKEN=$(echo "$body" | jq -r '.access_token // empty')
TOTAL=$((TOTAL + 1))
if ([ "$status" = "200" ] || [ "$status" = "201" ]) && [ -n "$USER_TOKEN" ]; then
    echo -e "${GREEN}✅${NC} [Auth] User Login (Status: $status)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} [Auth] User Login (Status: $status)"
    FAILED=$((FAILED + 1))
fi

# Invalid Login (should fail)
response=$(curl -s -w '\n%{http_code}' -X POST \
    -H 'Content-Type: application/json' \
    -d '{"email":"invalid@test.com","password":"wrong"}' \
    "$API_BASE/auth/login")
status=$(echo "$response" | tail -n1)
TOTAL=$((TOTAL + 1))
if [ "$status" = "401" ]; then
    echo -e "${GREEN}✅${NC} [Auth] Invalid Login Rejected (Status: $status)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} [Auth] Invalid Login Rejected (Expected 401, Got: $status)"
    FAILED=$((FAILED + 1))
fi

echo -e "\n${BLUE}📋 ACCOUNT MANAGEMENT TESTS${NC}\n"

# List Accounts
response=$(curl -s -w '\n%{http_code}' -X GET \
    -H "Authorization: Bearer $USER_TOKEN" \
    "$API_BASE/accounts?limit=10")
status=$(echo "$response" | tail -n1)
TOTAL=$((TOTAL + 1))
if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅${NC} [Accounts] List Accounts (Status: $status)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} [Accounts] List Accounts (Status: $status)"
    FAILED=$((FAILED + 1))
fi

echo -e "\n${BLUE}📋 COACHING TESTS${NC}\n"

# My Action Items
response=$(curl -s -w '\n%{http_code}' -X GET \
    -H "Authorization: Bearer $USER_TOKEN" \
    "$API_BASE/coaching/action-items/my-items")
status=$(echo "$response" | tail -n1)
TOTAL=$((TOTAL + 1))
if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅${NC} [Coaching] My Action Items (Status: $status)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} [Coaching] My Action Items (Status: $status)"
    FAILED=$((FAILED + 1))
fi

# My Progress Report
response=$(curl -s -w '\n%{http_code}' -X GET \
    -H "Authorization: Bearer $USER_TOKEN" \
    "$API_BASE/coaching/action-items/reports/my-progress")
status=$(echo "$response" | tail -n1)
TOTAL=$((TOTAL + 1))
if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅${NC} [Coaching] My Progress Report (Status: $status)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} [Coaching] My Progress Report (Status: $status)"
    FAILED=$((FAILED + 1))
fi

# Coaching Sessions
response=$(curl -s -w '\n%{http_code}' -X GET \
    -H "Authorization: Bearer $USER_TOKEN" \
    "$API_BASE/coaching/sessions?limit=10")
status=$(echo "$response" | tail -n1)
TOTAL=$((TOTAL + 1))
if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅${NC} [Coaching] List Sessions (Status: $status)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} [Coaching] List Sessions (Status: $status)"
    FAILED=$((FAILED + 1))
fi

echo -e "\n${BLUE}📋 MANAGER INSIGHTS TESTS${NC}\n"

# Recommendation Metrics
response=$(curl -s -w '\n%{http_code}' -X GET \
    -H "Authorization: Bearer $MANAGER_TOKEN" \
    "$API_BASE/admin/insights/recommendations")
status=$(echo "$response" | tail -n1)
TOTAL=$((TOTAL + 1))
if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅${NC} [Insights] Recommendation Metrics (Status: $status)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} [Insights] Recommendation Metrics (Status: $status)"
    FAILED=$((FAILED + 1))
fi

# Rep Comparison
response=$(curl -s -w '\n%{http_code}' -X GET \
    -H "Authorization: Bearer $MANAGER_TOKEN" \
    "$API_BASE/admin/insights/rep-comparison")
status=$(echo "$response" | tail -n1)
TOTAL=$((TOTAL + 1))
if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅${NC} [Insights] Rep Comparison (Status: $status)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} [Insights] Rep Comparison (Status: $status)"
    FAILED=$((FAILED + 1))
fi

# Deal Outcomes
response=$(curl -s -w '\n%{http_code}' -X GET \
    -H "Authorization: Bearer $MANAGER_TOKEN" \
    "$API_BASE/admin/insights/deal-outcomes")
status=$(echo "$response" | tail -n1)
TOTAL=$((TOTAL + 1))
if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅${NC} [Insights] Deal Outcomes (Status: $status)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} [Insights] Deal Outcomes (Status: $status)"
    FAILED=$((FAILED + 1))
fi

# Trends
response=$(curl -s -w '\n%{http_code}' -X GET \
    -H "Authorization: Bearer $MANAGER_TOKEN" \
    "$API_BASE/admin/insights/trends")
status=$(echo "$response" | tail -n1)
TOTAL=$((TOTAL + 1))
if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅${NC} [Insights] Recommendation Trends (Status: $status)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} [Insights] Recommendation Trends (Status: $status)"
    FAILED=$((FAILED + 1))
fi

echo -e "\n${BLUE}📋 ADMIN TESTS${NC}\n"

# Admin Dashboard
response=$(curl -s -w '\n%{http_code}' -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$API_BASE/admin/dashboard")
status=$(echo "$response" | tail -n1)
TOTAL=$((TOTAL + 1))
if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅${NC} [Admin] Dashboard (Status: $status)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} [Admin] Dashboard (Status: $status)"
    FAILED=$((FAILED + 1))
fi

# List Agents (Admin)
response=$(curl -s -w '\n%{http_code}' -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$API_BASE/admin/agents")
status=$(echo "$response" | tail -n1)
TOTAL=$((TOTAL + 1))
if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅${NC} [Admin] List Agents (Status: $status)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} [Admin] List Agents (Status: $status)"
    FAILED=$((FAILED + 1))
fi

# Manager blocked from Agents
response=$(curl -s -w '\n%{http_code}' -X GET \
    -H "Authorization: Bearer $MANAGER_TOKEN" \
    "$API_BASE/admin/agents")
status=$(echo "$response" | tail -n1)
TOTAL=$((TOTAL + 1))
if [ "$status" = "403" ]; then
    echo -e "${GREEN}✅${NC} [Admin] Manager Blocked from Agents (Status: $status)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} [Admin] Manager Blocked from Agents (Expected 403, Got: $status)"
    FAILED=$((FAILED + 1))
fi

# Integrations
response=$(curl -s -w '\n%{http_code}' -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$API_BASE/admin/integrations")
status=$(echo "$response" | tail -n1)
TOTAL=$((TOTAL + 1))
if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅${NC} [Admin] List Integrations (Status: $status)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} [Admin] List Integrations (Status: $status)"
    FAILED=$((FAILED + 1))
fi

echo -e "\n${BLUE}📋 SIGNALS & NOTIFICATIONS TESTS${NC}\n"

# List Signals
response=$(curl -s -w '\n%{http_code}' -X GET \
    -H "Authorization: Bearer $USER_TOKEN" \
    "$API_BASE/digital-workers/signals?limit=10")
status=$(echo "$response" | tail -n1)
TOTAL=$((TOTAL + 1))
if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅${NC} [Signals] List Signals (Status: $status)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} [Signals] List Signals (Status: $status)"
    FAILED=$((FAILED + 1))
fi

# Notifications
response=$(curl -s -w '\n%{http_code}' -X GET \
    -H "Authorization: Bearer $USER_TOKEN" \
    "$API_BASE/notifications?limit=10")
status=$(echo "$response" | tail -n1)
TOTAL=$((TOTAL + 1))
if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅${NC} [Notifications] List Notifications (Status: $status)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} [Notifications] List Notifications (Status: $status)"
    FAILED=$((FAILED + 1))
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "   TEST SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✅ Passed:${NC} $PASSED/$TOTAL"
echo -e "${RED}❌ Failed:${NC} $FAILED/$TOTAL"

SUCCESS_RATE=$((PASSED * 100 / TOTAL))
echo -e "📊 Success Rate: ${SUCCESS_RATE}%"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "\n${YELLOW}⚠️  Some tests failed. Review the output above.${NC}"
    exit 1
fi
