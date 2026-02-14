#!/bin/bash
set -e

echo "=== SalesOS ALB and SSL Setup Script ==="
echo ""

# Check AWS credentials
echo "Testing AWS credentials..."
if ! aws sts get-caller-identity &>/dev/null; then
    echo "ERROR: AWS credentials not configured or invalid"
    echo ""
    echo "Please configure AWS credentials first:"
    echo "  aws configure"
    echo ""
    echo "Or set environment variables:"
    echo "  export AWS_ACCESS_KEY_ID='your-key'"
    echo "  export AWS_SECRET_ACCESS_KEY='your-secret'"
    echo "  export AWS_DEFAULT_REGION='us-east-1'"
    exit 1
fi

echo "✓ AWS credentials valid"
echo ""

# Step 1: Find Load Balancer
echo "Step 1: Finding Load Balancer..."
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --region us-east-1 \
  --query 'LoadBalancers[?contains(DNSName, `beta-iriseller`)].LoadBalancerArn' \
  --output text)

if [ -z "$ALB_ARN" ]; then
    echo "ERROR: Could not find load balancer"
    exit 1
fi

echo "✓ ALB ARN: $ALB_ARN"

# Step 2: Get Target Group
echo ""
echo "Step 2: Getting Target Group..."
TG_ARN=$(aws elbv2 describe-target-groups \
  --load-balancer-arn $ALB_ARN \
  --region us-east-1 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "✓ Target Group ARN: $TG_ARN"

# Step 3: Get Listener ARNs
echo ""
echo "Step 3: Getting Listener ARNs..."
HTTPS_LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --region us-east-1 \
  --query 'Listeners[?Port==`443`].ListenerArn' \
  --output text)

HTTP_LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --region us-east-1 \
  --query 'Listeners[?Port==`80`].ListenerArn' \
  --output text)

echo "✓ HTTPS Listener ARN: $HTTPS_LISTENER_ARN"
echo "✓ HTTP Listener ARN: $HTTP_LISTENER_ARN"

# Step 4: Request Certificate
echo ""
echo "Step 4: Requesting SSL Certificate..."
CERT_ARN=$(aws acm request-certificate \
  --region us-east-1 \
  --domain-name salesos.org \
  --subject-alternative-names www.salesos.org \
  --validation-method DNS \
  --tags Key=Name,Value=salesos.org \
  --query 'CertificateArn' \
  --output text)

echo "✓ Certificate ARN: $CERT_ARN"

# Step 5: Get DNS Validation Records
echo ""
echo "=========================================="
echo "Step 5: DNS Validation Records"
echo "=========================================="
echo ""
echo "Add these CNAME records to your Cloudflare DNS:"
echo ""

sleep 2  # Wait for cert request to propagate

aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[*].[DomainName,ResourceRecord.Name,ResourceRecord.Value]' \
  --output table

echo ""
echo "IMPORTANT STEPS:"
echo "1. Go to Cloudflare DNS for salesos.org"
echo "2. Add the CNAME records shown above"
echo "3. Set Proxy Status to 'DNS Only' (gray cloud, NOT orange)"
echo "4. Also update root domain DNS to point to ALB:"
echo "   - Delete existing A records (104.21.62.91, 172.67.222.113)"
echo "   - Add CNAME: @ -> beta-iriseller-com-262889512.us-east-1.elb.amazonaws.com"
echo "   - Set Proxy Status to 'DNS Only'"
echo ""
read -p "Press Enter after adding ALL DNS records to continue..."

# Step 6: Wait for certificate validation
echo ""
echo "Step 6: Waiting for certificate validation..."
echo "(This usually takes 5-30 minutes)"
CERT_STATUS="PENDING_VALIDATION"
ATTEMPTS=0
MAX_ATTEMPTS=60  # 30 minutes

while [ "$CERT_STATUS" != "ISSUED" ] && [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  sleep 30
  ATTEMPTS=$((ATTEMPTS + 1))
  CERT_STATUS=$(aws acm describe-certificate \
    --certificate-arn $CERT_ARN \
    --region us-east-1 \
    --query 'Certificate.Status' \
    --output text 2>/dev/null || echo "PENDING_VALIDATION")
  echo "Certificate Status: $CERT_STATUS (attempt $ATTEMPTS/$MAX_ATTEMPTS)"
done

if [ "$CERT_STATUS" != "ISSUED" ]; then
    echo ""
    echo "ERROR: Certificate validation timed out"
    echo "Please check:"
    echo "1. CNAME records are correctly added to Cloudflare"
    echo "2. Cloudflare proxy is set to 'DNS Only' (gray cloud)"
    echo "3. Wait a bit longer and check certificate status in ACM console"
    echo ""
    echo "Certificate ARN: $CERT_ARN"
    exit 1
fi

echo "✓ Certificate validated successfully!"

# Step 7: Add certificate to HTTPS listener
echo ""
echo "Step 7: Adding certificate to ALB HTTPS listener..."
aws elbv2 add-listener-certificates \
  --listener-arn $HTTPS_LISTENER_ARN \
  --certificates CertificateArn=$CERT_ARN \
  --region us-east-1

echo "✓ Certificate added to listener"

# Step 8: Create HTTPS listener rule
echo ""
echo "Step 8: Creating HTTPS listener rule..."
HTTPS_RULE_ARN=$(aws elbv2 create-rule \
  --listener-arn $HTTPS_LISTENER_ARN \
  --priority 10 \
  --conditions '[{"Field":"host-header","Values":["salesos.org","www.salesos.org"]}]' \
  --actions '[{"Type":"forward","TargetGroupArn":"'$TG_ARN'"}]' \
  --region us-east-1 \
  --query 'Rules[0].RuleArn' \
  --output text 2>&1)

if [[ $HTTPS_RULE_ARN == *"PriorityInUse"* ]]; then
    echo "⚠ Priority 10 is in use, trying priority 11..."
    HTTPS_RULE_ARN=$(aws elbv2 create-rule \
      --listener-arn $HTTPS_LISTENER_ARN \
      --priority 11 \
      --conditions '[{"Field":"host-header","Values":["salesos.org","www.salesos.org"]}]' \
      --actions '[{"Type":"forward","TargetGroupArn":"'$TG_ARN'"}]' \
      --region us-east-1 \
      --query 'Rules[0].RuleArn' \
      --output text)
fi

echo "✓ HTTPS rule created: $HTTPS_RULE_ARN"

# Step 9: Create HTTP redirect rule
echo ""
echo "Step 9: Creating HTTP redirect rule..."
HTTP_RULE_ARN=$(aws elbv2 create-rule \
  --listener-arn $HTTP_LISTENER_ARN \
  --priority 10 \
  --conditions '[{"Field":"host-header","Values":["salesos.org","www.salesos.org"]}]' \
  --actions '[{"Type":"redirect","RedirectConfig":{"Protocol":"HTTPS","Port":"443","StatusCode":"HTTP_301"}}]' \
  --region us-east-1 \
  --query 'Rules[0].RuleArn' \
  --output text 2>&1)

if [[ $HTTP_RULE_ARN == *"PriorityInUse"* ]]; then
    echo "⚠ Priority 10 is in use, trying priority 11..."
    HTTP_RULE_ARN=$(aws elbv2 create-rule \
      --listener-arn $HTTP_LISTENER_ARN \
      --priority 11 \
      --conditions '[{"Field":"host-header","Values":["salesos.org","www.salesos.org"]}]' \
      --actions '[{"Type":"redirect","RedirectConfig":{"Protocol":"HTTPS","Port":"443","StatusCode":"HTTP_301"}}]' \
      --region us-east-1 \
      --query 'Rules[0].RuleArn' \
      --output text)
fi

echo "✓ HTTP redirect rule created: $HTTP_RULE_ARN"

# Step 10: Verify target health
echo ""
echo "Step 10: Checking target health..."
aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN \
  --region us-east-1 \
  --query 'TargetHealthDescriptions[*].[Target.Id,TargetHealth.State,TargetHealth.Reason]' \
  --output table

echo ""
echo "=========================================="
echo "=== Setup Complete! ==="
echo "=========================================="
echo ""
echo "Configuration Summary:"
echo "- Certificate ARN: $CERT_ARN"
echo "- HTTPS Listener Rule: $HTTPS_RULE_ARN"
echo "- HTTP Redirect Rule: $HTTP_RULE_ARN"
echo "- Target Group: $TG_ARN"
echo ""
echo "✓ SSL certificate issued and attached"
echo "✓ ALB listener rules created"
echo "✓ HTTP -> HTTPS redirect configured"
echo ""
echo "Wait 5-10 minutes for DNS propagation, then test:"
echo ""
echo "  # Check DNS"
echo "  dig salesos.org +short"
echo ""
echo "  # Test HTTPS"
echo "  curl -I https://salesos.org"
echo ""
echo "  # Test API"
echo "  curl -s https://salesos.org/api/health"
echo ""
echo "  # Open in browser"
echo "  https://salesos.org"
echo ""
echo "=========================================="
