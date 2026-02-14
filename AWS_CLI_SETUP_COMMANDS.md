# AWS CLI Setup and Configuration for salesos.org

## Step 1: Configure AWS Credentials

You need to configure AWS CLI with valid credentials that have permissions to:
- AWS Certificate Manager (ACM)
- Elastic Load Balancing (ELB/ALB)
- EC2 (for security groups and target groups)

### Option A: Configure Interactively
```bash
aws configure
# Enter when prompted:
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region: us-east-1
# Default output format: json
```

### Option B: Set Environment Variables
```bash
export AWS_ACCESS_KEY_ID="YOUR_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="YOUR_SECRET_KEY"
export AWS_DEFAULT_REGION="us-east-1"
```

### Option C: Manual Configuration
```bash
# Edit credentials file
nano ~/.aws/credentials

# Add:
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY

# Edit config file
nano ~/.aws/config

# Add:
[default]
region = us-east-1
output = json
```

### Test Configuration
```bash
aws sts get-caller-identity
# Should return your AWS account details
```

---

## Step 2: Get ALB and Target Group ARNs

```bash
# Find your load balancer ARN
aws elbv2 describe-load-balancers \
  --region us-east-1 \
  --query 'LoadBalancers[?contains(DNSName, `beta-iriseller`)].[LoadBalancerArn,DNSName,LoadBalancerName]' \
  --output table

# Save the LoadBalancerArn for later use
export ALB_ARN="arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:loadbalancer/app/NAME/ID"
```

```bash
# Get target group ARN
aws elbv2 describe-target-groups \
  --load-balancer-arn $ALB_ARN \
  --region us-east-1 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text

# Save for later
export TG_ARN="arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/NAME/ID"
```

```bash
# Get listener ARNs
aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --region us-east-1 \
  --query 'Listeners[].[ListenerArn,Port,Protocol]' \
  --output table

# Save HTTPS listener ARN
export HTTPS_LISTENER_ARN="arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:listener/app/NAME/ID/ID"

# Save HTTP listener ARN
export HTTP_LISTENER_ARN="arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:listener/app/NAME/ID/ID"
```

---

## Step 3: Request SSL Certificate

```bash
# Request certificate for salesos.org
aws acm request-certificate \
  --region us-east-1 \
  --domain-name salesos.org \
  --subject-alternative-names www.salesos.org \
  --validation-method DNS \
  --tags Key=Name,Value=salesos.org \
  --output json

# Save the CertificateArn from output
export CERT_ARN="arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/ID"
```

### Get DNS Validation Records
```bash
# Get validation records to add to DNS
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[*].[DomainName,ResourceRecord.Name,ResourceRecord.Value]' \
  --output table

# Copy the CNAME records and add them to Cloudflare
```

**Important**: Add the CNAME validation records to your Cloudflare DNS before proceeding.

### Check Certificate Status
```bash
# Wait for certificate to be validated (5-30 minutes)
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text

# Run this every few minutes until it returns "ISSUED"
```

---

## Step 4: Add Certificate to ALB HTTPS Listener

```bash
# Add certificate to HTTPS listener
aws elbv2 add-listener-certificates \
  --listener-arn $HTTPS_LISTENER_ARN \
  --certificates CertificateArn=$CERT_ARN \
  --region us-east-1

# Verify certificate is added
aws elbv2 describe-listener-certificates \
  --listener-arn $HTTPS_LISTENER_ARN \
  --region us-east-1 \
  --query 'Certificates[*].CertificateArn' \
  --output table
```

---

## Step 5: Add ALB Listener Rules

### Create HTTPS Listener Rule for salesos.org

```bash
# Add rule to forward salesos.org traffic to target group
aws elbv2 create-rule \
  --listener-arn $HTTPS_LISTENER_ARN \
  --priority 10 \
  --conditions '[{"Field":"host-header","Values":["salesos.org","www.salesos.org"]}]' \
  --actions '[{"Type":"forward","TargetGroupArn":"'$TG_ARN'"}]' \
  --region us-east-1

# Save the RuleArn from output
export HTTPS_RULE_ARN="arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:listener-rule/app/NAME/ID/ID/ID"
```

### Create HTTP Redirect Rule for salesos.org

```bash
# Add rule to redirect HTTP to HTTPS
aws elbv2 create-rule \
  --listener-arn $HTTP_LISTENER_ARN \
  --priority 10 \
  --conditions '[{"Field":"host-header","Values":["salesos.org","www.salesos.org"]}]' \
  --actions '[{"Type":"redirect","RedirectConfig":{"Protocol":"HTTPS","Port":"443","StatusCode":"HTTP_301"}}]' \
  --region us-east-1
```

---

## Step 6: Verify Configuration

### Check Listener Rules
```bash
# List all rules for HTTPS listener
aws elbv2 describe-rules \
  --listener-arn $HTTPS_LISTENER_ARN \
  --region us-east-1 \
  --query 'Rules[*].[Priority,Conditions[0].Values,Actions[0].Type]' \
  --output table

# List all rules for HTTP listener
aws elbv2 describe-rules \
  --listener-arn $HTTP_LISTENER_ARN \
  --region us-east-1 \
  --query 'Rules[*].[Priority,Conditions[0].Values,Actions[0].Type]' \
  --output table
```

### Check Target Group Health
```bash
# Check target health
aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN \
  --region us-east-1 \
  --query 'TargetHealthDescriptions[*].[Target.Id,TargetHealth.State,TargetHealth.Reason]' \
  --output table

# Should show "healthy" for instance i-0c28f6efb2ad0f161
```

### Check Security Groups
```bash
# Get ALB security groups
aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --region us-east-1 \
  --query 'LoadBalancers[0].SecurityGroups' \
  --output table

# Check ALB security group rules
aws ec2 describe-security-groups \
  --group-ids sg-06275c321c4a61cd6 \
  --region us-east-1 \
  --query 'SecurityGroups[0].IpPermissions[*].[IpProtocol,FromPort,ToPort,IpRanges[0].CidrIp]' \
  --output table

# Check EC2 instance security group
aws ec2 describe-security-groups \
  --group-ids sg-03fe36c49e0c2ba68 \
  --region us-east-1 \
  --query 'SecurityGroups[0].IpPermissions[*].[IpProtocol,FromPort,ToPort,UserIdGroupPairs[0].GroupId]' \
  --output table
```

---

## Step 7: Test the Configuration

### DNS Check
```bash
# Check DNS resolution
dig salesos.org +short
# Should return: 54.196.40.122 and 100.51.167.249

nslookup salesos.org
```

### HTTP Test
```bash
# Test HTTP redirect
curl -I http://salesos.org
# Should return: 301 Moved Permanently, Location: https://salesos.org/

curl -I http://www.salesos.org
# Should return: 301 Moved Permanently
```

### HTTPS Test
```bash
# Test HTTPS access
curl -I https://salesos.org
# Should return: 200 OK

# Test backend API
curl -s https://salesos.org/api/health
# Should return: {"status":"healthy",...}

# Test with verbose SSL info
curl -v https://salesos.org 2>&1 | grep -i "subject:\|issuer:\|SSL"
```

---

## Complete Script (Run After AWS Credentials are Configured)

Save this as `/opt/salesos.org/setup_alb_ssl.sh`:

```bash
#!/bin/bash
set -e

echo "=== SalesOS ALB and SSL Setup Script ==="
echo ""

# Step 1: Find Load Balancer
echo "Step 1: Finding Load Balancer..."
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --region us-east-1 \
  --query 'LoadBalancers[?contains(DNSName, `beta-iriseller`)].LoadBalancerArn' \
  --output text)

echo "ALB ARN: $ALB_ARN"

# Step 2: Get Target Group
echo ""
echo "Step 2: Getting Target Group..."
TG_ARN=$(aws elbv2 describe-target-groups \
  --load-balancer-arn $ALB_ARN \
  --region us-east-1 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "Target Group ARN: $TG_ARN"

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

echo "HTTPS Listener ARN: $HTTPS_LISTENER_ARN"
echo "HTTP Listener ARN: $HTTP_LISTENER_ARN"

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

echo "Certificate ARN: $CERT_ARN"

# Step 5: Get DNS Validation Records
echo ""
echo "Step 5: DNS Validation Records (Add these to Cloudflare):"
echo "=========================================================="
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[*].[DomainName,ResourceRecord.Name,ResourceRecord.Value]' \
  --output table

echo ""
echo "IMPORTANT: Add the CNAME records above to your Cloudflare DNS"
echo "             Set Proxy Status to 'DNS Only' (gray cloud)"
echo ""
read -p "Press Enter after adding DNS records to continue..."

# Step 6: Wait for certificate validation
echo ""
echo "Step 6: Waiting for certificate validation..."
CERT_STATUS="PENDING_VALIDATION"
while [ "$CERT_STATUS" != "ISSUED" ]; do
  sleep 30
  CERT_STATUS=$(aws acm describe-certificate \
    --certificate-arn $CERT_ARN \
    --region us-east-1 \
    --query 'Certificate.Status' \
    --output text)
  echo "Certificate Status: $CERT_STATUS"
done

echo "Certificate validated successfully!"

# Step 7: Add certificate to HTTPS listener
echo ""
echo "Step 7: Adding certificate to ALB HTTPS listener..."
aws elbv2 add-listener-certificates \
  --listener-arn $HTTPS_LISTENER_ARN \
  --certificates CertificateArn=$CERT_ARN \
  --region us-east-1

echo "Certificate added to listener"

# Step 8: Create HTTPS listener rule
echo ""
echo "Step 8: Creating HTTPS listener rule..."
aws elbv2 create-rule \
  --listener-arn $HTTPS_LISTENER_ARN \
  --priority 10 \
  --conditions '[{"Field":"host-header","Values":["salesos.org","www.salesos.org"]}]' \
  --actions '[{"Type":"forward","TargetGroupArn":"'$TG_ARN'"}]' \
  --region us-east-1

echo "HTTPS rule created"

# Step 9: Create HTTP redirect rule
echo ""
echo "Step 9: Creating HTTP redirect rule..."
aws elbv2 create-rule \
  --listener-arn $HTTP_LISTENER_ARN \
  --priority 10 \
  --conditions '[{"Field":"host-header","Values":["salesos.org","www.salesos.org"]}]' \
  --actions '[{"Type":"redirect","RedirectConfig":{"Protocol":"HTTPS","Port":"443","StatusCode":"HTTP_301"}}]' \
  --region us-east-1

echo "HTTP redirect rule created"

# Step 10: Verify target health
echo ""
echo "Step 10: Checking target health..."
aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN \
  --region us-east-1 \
  --query 'TargetHealthDescriptions[*].[Target.Id,TargetHealth.State]' \
  --output table

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Configuration Summary:"
echo "- Certificate ARN: $CERT_ARN"
echo "- HTTPS Listener Rule: Created"
echo "- HTTP Redirect Rule: Created"
echo ""
echo "Test your setup:"
echo "  curl -I https://salesos.org"
echo "  curl -s https://salesos.org/api/health"
echo ""
echo "DNS must be pointing to ALB: beta-iriseller-com-262889512.us-east-1.elb.amazonaws.com"
```

Make it executable:
```bash
chmod +x /opt/salesos.org/setup_alb_ssl.sh
```

Run it:
```bash
/opt/salesos.org/setup_alb_ssl.sh
```

---

## Troubleshooting Commands

### Check Certificate Status
```bash
aws acm list-certificates \
  --region us-east-1 \
  --query 'CertificateSummaryList[?DomainName==`salesos.org`]' \
  --output table
```

### Delete a Rule (if needed)
```bash
# Get rule ARN first
aws elbv2 describe-rules \
  --listener-arn $HTTPS_LISTENER_ARN \
  --region us-east-1

# Delete rule
aws elbv2 delete-rule \
  --rule-arn "RULE_ARN" \
  --region us-east-1
```

### Update Rule Priority (if conflict)
```bash
aws elbv2 modify-rule \
  --rule-arn "RULE_ARN" \
  --priority 15 \
  --region us-east-1
```

---

## Required IAM Permissions

Your AWS credentials need these permissions:
- `acm:RequestCertificate`
- `acm:DescribeCertificate`
- `acm:ListCertificates`
- `elasticloadbalancing:DescribeLoadBalancers`
- `elasticloadbalancing:DescribeListeners`
- `elasticloadbalancing:DescribeTargetGroups`
- `elasticloadbalancing:DescribeRules`
- `elasticloadbalancing:CreateRule`
- `elasticloadbalancing:AddListenerCertificates`
- `elasticloadbalancing:DescribeTargetHealth`
- `ec2:DescribeSecurityGroups`

---

## Summary

After running all commands:
1. ✅ SSL certificate requested and validated
2. ✅ Certificate added to ALB HTTPS listener
3. ✅ Listener rule created to forward salesos.org traffic
4. ✅ HTTP redirect rule created
5. ✅ Ready to access https://salesos.org

**DNS must be updated** to point to the ALB before the site will work publicly.
