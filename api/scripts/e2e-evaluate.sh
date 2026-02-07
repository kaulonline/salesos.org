#!/bin/bash
#
# LLM Judge Evaluation for E2E Test Results
# Uses Claude to analyze test results and identify gaps
#

# Run the E2E tests and capture results
echo "Running E2E tests..."
RESULTS=$(/opt/IRIS_Sales_GPT/api/scripts/run-e2e-tests.sh 2>&1)

# Extract summary
PASSED=$(echo "$RESULTS" | grep "Passed:" | grep -oP '\d+(?=/)')
TOTAL=$(echo "$RESULTS" | grep "Passed:" | grep -oP '(?<=/)\d+')
FAILED=$((TOTAL - PASSED))
SUCCESS_RATE=$((PASSED * 100 / TOTAL))

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "   LLM JUDGE EVALUATION"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Prepare the evaluation prompt
PROMPT="You are a QA engineer evaluating an end-to-end test run for the IRIS Sales Coaching AI application.

## Test Results
- Total Tests: $TOTAL
- Passed: $PASSED
- Failed: $FAILED
- Success Rate: ${SUCCESS_RATE}%

## Test Output:
\`\`\`
$RESULTS
\`\`\`

Please provide:

1. **Overall Health Score** (0-100): Rate the application's health based on test results

2. **Test Coverage Assessment**: Are the tests comprehensive? What areas need more testing?

3. **User Impact Analysis**: Based on passed/failed tests, how would real users be affected?

4. **Recommended Actions**: Prioritized list of improvements

5. **Positive Findings**: What's working well?

Keep your response concise and actionable."

# Create JSON payload for API
PAYLOAD=$(jq -n \
  --arg prompt "$PROMPT" \
  '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1500,
    "messages": [{"role": "user", "content": $prompt}]
  }')

# Get API credentials from environment or .env file
if [ -f /opt/IRIS_Sales_GPT/api/.env ]; then
    source /opt/IRIS_Sales_GPT/api/.env
fi

ANTHROPIC_ENDPOINT="${ANTHROPIC_ENDPOINT:-https://api.anthropic.com/v1}"
API_KEY="${ANTHROPIC_API_KEY}"

if [ -z "$API_KEY" ]; then
    echo "⚠️  No API key found. Skipping LLM evaluation."
    echo ""
    echo "Test results summary:"
    echo "$RESULTS" | tail -15
    exit 0
fi

echo "🤖 Analyzing with Claude..."
echo ""

# Call Claude API
RESPONSE=$(curl -s "$ANTHROPIC_ENDPOINT/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d "$PAYLOAD" 2>/dev/null)

# Extract and display the response
EVALUATION=$(echo "$RESPONSE" | jq -r '.content[0].text // "Unable to get evaluation"')

echo "$EVALUATION"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "   END OF EVALUATION"
echo "═══════════════════════════════════════════════════════════════"
