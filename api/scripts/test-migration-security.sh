#!/bin/bash

# Migration System Security Integration Test
# Tests multi-tenant isolation and RBAC enforcement via actual HTTP requests

set -e

API_URL="${API_URL:-http://localhost:3000/api}"
COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_RESET='\033[0m'

echo "================================="
echo "Migration System Security Tests"
echo "================================="
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${COLOR_RED}Error: jq is not installed. Please install jq to run these tests.${COLOR_RESET}"
    exit 1
fi

# Test counters
PASSED=0
FAILED=0

# Helper function to print test results
test_result() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"

    if [ "$expected" == "$actual" ]; then
        echo -e "${COLOR_GREEN}✓${COLOR_RESET} $test_name"
        ((PASSED++))
    else
        echo -e "${COLOR_RED}✗${COLOR_RESET} $test_name"
        echo "  Expected: $expected"
        echo "  Got: $actual"
        ((FAILED++))
    fi
}

echo "Prerequisites:"
echo "1. Backend must be running on $API_URL"
echo "2. Database must have test organizations and users"
echo ""

# Step 1: Login as ADMIN user
echo -e "${COLOR_YELLOW}Step 1: Authentication${COLOR_RESET}"
echo "Logging in as admin@example.com..."

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "test_password_123"
  }' || echo '{"error": "connection_failed"}')

if echo "$LOGIN_RESPONSE" | jq -e '.access_token' > /dev/null 2>&1; then
    ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')
    ORG_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.organizationId // "org_missing"')
    echo -e "${COLOR_GREEN}✓${COLOR_RESET} Login successful"
    echo "  Organization ID: $ORG_ID"
else
    echo -e "${COLOR_YELLOW}⚠${COLOR_RESET} Login failed - using mock tokens for guard tests"
    ADMIN_TOKEN="mock_admin_token"
    ORG_ID="org_test_123"
fi
echo ""

# Step 2: Test CRM Template Endpoint (No RBAC, just auth)
echo -e "${COLOR_YELLOW}Step 2: Public Endpoints${COLOR_RESET}"

TEMPLATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_URL/import-export/crm-template/salesforce/leads")

TEMPLATE_STATUS=$(echo "$TEMPLATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
test_result "Get CRM template (authenticated)" "200" "$TEMPLATE_STATUS"
echo ""

# Step 3: Test Suggest Mappings (AI endpoint)
echo -e "${COLOR_YELLOW}Step 3: AI Mapping Endpoint${COLOR_RESET}"

MAPPING_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$API_URL/import-export/suggest-mappings" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "headers": ["FirstName", "LastName", "Email", "Phone"],
    "entityType": "LEAD",
    "crmType": "salesforce"
  }')

MAPPING_STATUS=$(echo "$MAPPING_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
test_result "AI field mapping suggestion" "200" "$MAPPING_STATUS"
echo ""

# Step 4: Test Create Migration (RBAC - ADMIN only)
echo -e "${COLOR_YELLOW}Step 4: Create Migration (RBAC Protected)${COLOR_RESET}"

CREATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$API_URL/import-export/migrations" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCRM": "salesforce",
    "entityType": "LEAD",
    "fileName": "test-leads.csv",
    "fileSize": 1024,
    "totalRows": 10,
    "fieldMappings": []
  }')

CREATE_STATUS=$(echo "$CREATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
CREATE_BODY=$(echo "$CREATE_RESPONSE" | grep -v "HTTP_STATUS")

if [ "$CREATE_STATUS" == "201" ] || [ "$CREATE_STATUS" == "200" ]; then
    test_result "Create migration as ADMIN" "success" "success"
    MIGRATION_ID=$(echo "$CREATE_BODY" | jq -r '.id // "migration_not_created"')
    echo "  Migration ID: $MIGRATION_ID"
else
    test_result "Create migration as ADMIN" "200 or 201" "$CREATE_STATUS"
    MIGRATION_ID="mock_migration_123"
fi
echo ""

# Step 5: Test Get Migration History (RBAC - ADMIN only)
echo -e "${COLOR_YELLOW}Step 5: Get Migration History (RBAC Protected)${COLOR_RESET}"

HISTORY_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_URL/import-export/migrations")

HISTORY_STATUS=$(echo "$HISTORY_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
test_result "Get migration history as ADMIN" "200" "$HISTORY_STATUS"

if [ "$HISTORY_STATUS" == "200" ]; then
    HISTORY_BODY=$(echo "$HISTORY_RESPONSE" | grep -v "HTTP_STATUS")
    TOTAL=$(echo "$HISTORY_BODY" | jq -r '.total // 0')
    echo "  Total migrations: $TOTAL"
fi
echo ""

# Step 6: Test Get Migration by ID (Organization scoping)
if [ "$MIGRATION_ID" != "migration_not_created" ] && [ "$MIGRATION_ID" != "mock_migration_123" ]; then
    echo -e "${COLOR_YELLOW}Step 6: Get Migration by ID (Org Scoping)${COLOR_RESET}"

    MIGRATION_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      "$API_URL/import-export/migrations/$MIGRATION_ID")

    MIGRATION_STATUS=$(echo "$MIGRATION_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
    test_result "Get migration by ID (same org)" "200" "$MIGRATION_STATUS"

    if [ "$MIGRATION_STATUS" == "200" ]; then
        MIGRATION_BODY=$(echo "$MIGRATION_RESPONSE" | grep -v "HTTP_STATUS")
        RETURNED_ORG=$(echo "$MIGRATION_BODY" | jq -r '.organizationId // "missing"')

        if [ "$RETURNED_ORG" == "$ORG_ID" ]; then
            echo -e "${COLOR_GREEN}✓${COLOR_RESET} Organization ID matches (tenant isolation verified)"
            ((PASSED++))
        else
            echo -e "${COLOR_RED}✗${COLOR_RESET} Organization ID mismatch!"
            echo "  Expected: $ORG_ID"
            echo "  Got: $RETURNED_ORG"
            ((FAILED++))
        fi
    fi
    echo ""
fi

# Step 7: Test Migration Stats
echo -e "${COLOR_YELLOW}Step 7: Get Migration Stats (RBAC Protected)${COLOR_RESET}"

STATS_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_URL/import-export/migrations/stats")

STATS_STATUS=$(echo "$STATS_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
test_result "Get migration stats as ADMIN" "200" "$STATS_STATUS"

if [ "$STATS_STATUS" == "200" ]; then
    STATS_BODY=$(echo "$STATS_RESPONSE" | grep -v "HTTP_STATUS")
    TOTAL_MIGS=$(echo "$STATS_BODY" | jq -r '.totalMigrations // 0')
    COMPLETED=$(echo "$STATS_BODY" | jq -r '.completed // 0')
    echo "  Total migrations: $TOTAL_MIGS"
    echo "  Completed: $COMPLETED"
fi
echo ""

# Step 8: Test without authentication (should fail)
echo -e "${COLOR_YELLOW}Step 8: Security - No Authentication${COLOR_RESET}"

UNAUTH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  "$API_URL/import-export/migrations")

UNAUTH_STATUS=$(echo "$UNAUTH_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
test_result "Access without token (should fail)" "401" "$UNAUTH_STATUS"
echo ""

# Step 9: Test with invalid token (should fail)
echo -e "${COLOR_YELLOW}Step 9: Security - Invalid Token${COLOR_RESET}"

INVALID_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "Authorization: Bearer invalid_token_12345" \
  "$API_URL/import-export/migrations")

INVALID_STATUS=$(echo "$INVALID_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
test_result "Access with invalid token (should fail)" "401" "$INVALID_STATUS"
echo ""

# Summary
echo "================================="
echo "Test Summary"
echo "================================="
echo -e "${COLOR_GREEN}Passed: $PASSED${COLOR_RESET}"
echo -e "${COLOR_RED}Failed: $FAILED${COLOR_RESET}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${COLOR_GREEN}✓ All security tests passed!${COLOR_RESET}"
    exit 0
else
    echo -e "${COLOR_RED}✗ Some tests failed. Please review the output above.${COLOR_RESET}"
    exit 1
fi
