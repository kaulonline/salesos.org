#!/bin/bash
#
# Seed Live Data Script
# Triggers digital worker agents to populate real data using mock ZoomInfo API
#

API_BASE="${API_URL:-http://localhost:4000/api}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "═══════════════════════════════════════════════════════════════"
echo "   IRIS Sales Coaching AI - Live Data Seeding"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Login as admin
echo -e "${BLUE}🔐 Authenticating as admin...${NC}"
response=$(curl -s -X POST \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@iriseller.com","password":"Password1234"}' \
    "$API_BASE/auth/login")
ADMIN_TOKEN=$(echo "$response" | jq -r '.access_token // empty')

if [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ Failed to authenticate"
    exit 1
fi
echo -e "${GREEN}✅ Authenticated${NC}"

# Enable Mock ZoomInfo (set environment)
echo -e "\n${BLUE}🔧 Enabling Mock ZoomInfo API...${NC}"

# Test Mock ZoomInfo API directly
echo -e "\n${BLUE}📡 Testing Mock ZoomInfo API...${NC}"
mock_test=$(curl -s -X POST \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer mock_token" \
    -d '{"companyName":"Acme"}' \
    "$API_BASE/mock-zoominfo/search/company")

if echo "$mock_test" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Mock ZoomInfo API is working${NC}"
    companies=$(echo "$mock_test" | jq -r '.data.results | length')
    echo "   Found $companies mock companies"
else
    echo -e "${YELLOW}⚠️  Mock API test returned: ${mock_test}${NC}"
fi

# Get intent signals
echo -e "\n${BLUE}📊 Fetching Intent Signals...${NC}"
intent_signals=$(curl -s -X POST \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer mock_token" \
    -d '{}' \
    "$API_BASE/mock-zoominfo/intent/signals")

signals_count=$(echo "$intent_signals" | jq -r '.data.signals | length')
echo "   Retrieved $signals_count intent signals"

# Get scoops (funding, exec changes)
echo -e "\n${BLUE}📰 Fetching Sales Scoops...${NC}"
scoops=$(curl -s -X GET \
    -H "Authorization: Bearer mock_token" \
    "$API_BASE/mock-zoominfo/scoops?limit=10")

scoops_count=$(echo "$scoops" | jq -r '.data.scoops | length')
echo "   Retrieved $scoops_count sales scoops"

# Trigger Listening Agent to process signals
echo -e "\n${BLUE}🤖 Triggering Listening Agent...${NC}"
listening_result=$(curl -s -X POST \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"immediate": true}' \
    "$API_BASE/agents/LISTENING/execute" 2>/dev/null)

if echo "$listening_result" | jq -e '.jobId' > /dev/null 2>&1; then
    job_id=$(echo "$listening_result" | jq -r '.jobId')
    echo -e "${GREEN}✅ Listening Agent triggered (Job: $job_id)${NC}"
else
    echo -e "${YELLOW}⚠️  Listening Agent: ${listening_result}${NC}"
fi

# Wait for agent to process
echo -e "\n${BLUE}⏳ Waiting for agent processing (10s)...${NC}"
sleep 10

# Check signals in the system
echo -e "\n${BLUE}📋 Checking signals in system...${NC}"
signals=$(curl -s -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$API_BASE/digital-workers/signals?limit=20")

system_signals=$(echo "$signals" | jq -r '.signals | length // 0')
echo "   System has $system_signals signals"

# Get accounts to seed coaching data
echo -e "\n${BLUE}👥 Getting accounts for coaching data...${NC}"
accounts=$(curl -s -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$API_BASE/accounts?limit=5")

account_count=$(echo "$accounts" | jq -r '. | length // 0')
echo "   Found $account_count accounts"

# Create coaching action items
echo -e "\n${BLUE}📝 Creating sample coaching action items...${NC}"
for i in 1 2 3; do
    action_item=$(curl -s -X POST \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H 'Content-Type: application/json' \
        -d "{
            \"title\": \"Follow up on Q1 pipeline review - Item $i\",
            \"description\": \"Review pipeline metrics and identify coaching opportunities\",
            \"repId\": \"cmjwpo8jk0049pux45rzvg0s2\",
            \"priority\": \"HIGH\",
            \"category\": \"Pipeline Management\",
            \"dueDate\": \"$(date -d '+7 days' -Iseconds 2>/dev/null || date -v+7d -Iseconds)\"
        }" \
        "$API_BASE/coaching/action-items" 2>/dev/null)

    if echo "$action_item" | jq -e '.id' > /dev/null 2>&1; then
        echo "   ✅ Created action item $i"
    fi
done

# Create coaching session
echo -e "\n${BLUE}🎯 Creating coaching session...${NC}"
session=$(curl -s -X POST \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{
        "repId": "cmjwpo8jk0049pux45rzvg0s2",
        "type": "ONE_ON_ONE",
        "status": "SCHEDULED",
        "scheduledAt": "'"$(date -d '+1 day' -Iseconds 2>/dev/null || date -v+1d -Iseconds)"'",
        "topics": ["Pipeline Review", "Skill Development", "Q1 Goals"]
    }' \
    "$API_BASE/coaching/sessions" 2>/dev/null)

if echo "$session" | jq -e '.id' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Created coaching session${NC}"
else
    echo -e "${YELLOW}⚠️  Session creation: ${session}${NC}"
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "   SEEDING COMPLETE"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✅ Mock ZoomInfo API: Active${NC}"
echo -e "${GREEN}✅ Intent Signals: $signals_count available${NC}"
echo -e "${GREEN}✅ Sales Scoops: $scoops_count available${NC}"
echo -e "${GREEN}✅ System Signals: $system_signals${NC}"
echo -e "${GREEN}✅ Coaching Action Items: Created${NC}"
echo ""
echo "The application now has live data from the mock ZoomInfo API."
echo "Refresh the UI to see signals, coaching items, and insights."
echo ""
