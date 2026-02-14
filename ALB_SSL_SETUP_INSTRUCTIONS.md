# ALB and SSL Configuration for salesos.org

## 📋 Overview

**Domain**: salesos.org
**ALB**: beta-iriseller-com-262889512.us-east-1.elb.amazonaws.com
**Region**: us-east-1
**Backend Port**: 5000
**Frontend Port**: 5001
**Nginx Port**: 80

---

## Part 1: Request SSL Certificate in AWS Certificate Manager (ACM)

### Step 1: Request Certificate

1. **Log into AWS Console**: https://console.aws.amazon.com
2. **Go to Certificate Manager (ACM)**:
   - Services → Security, Identity & Compliance → Certificate Manager
   - **Make sure you're in us-east-1 region** (top right corner)

3. **Request Certificate**:
   - Click **"Request a certificate"**
   - Select **"Request a public certificate"**
   - Click **"Next"**

4. **Add Domain Names**:
   - Domain name 1: `salesos.org`
   - Click **"Add another name to this certificate"**
   - Domain name 2: `www.salesos.org`
   - Click **"Next"**

5. **Select Validation Method**:
   - Choose **"DNS validation - recommended"**
   - Click **"Next"**

6. **Add Tags (Optional)**:
   - Key: `Name`, Value: `salesos.org`
   - Click **"Next"**

7. **Review and Request**:
   - Review the details
   - Click **"Request"**

### Step 2: Validate Certificate

After requesting, you'll see the certificate with status **"Pending validation"**

1. **Click on the Certificate ID** to view details
2. **Copy DNS Validation Records**:
   - You'll see CNAME records for each domain
   - Example:
     ```
     Name: _abc123.salesos.org
     Value: _xyz456.acm-validations.aws.
     ```

3. **Add CNAME Records to Your DNS Provider**:

   **In Cloudflare (or your DNS provider)**:
   - Go to DNS → Records
   - Add CNAME record:
     - Type: **CNAME**
     - Name: Copy the name from ACM (e.g., `_abc123`)
     - Target: Copy the value from ACM (e.g., `_xyz456.acm-validations.aws.`)
     - Proxy Status: **DNS Only** (gray cloud)
     - TTL: **Auto**
   - Click **Save**
   - Repeat for www.salesos.org validation record

4. **Wait for Validation**:
   - Usually takes 5-30 minutes
   - Status will change from "Pending validation" to **"Issued"**
   - Refresh the ACM page to check status

---

## Part 2: Configure Application Load Balancer

### Step 3: Find Your Load Balancer

1. **Go to EC2 Console**:
   - Services → Compute → EC2
   - Make sure you're in **us-east-1 region**

2. **Navigate to Load Balancers**:
   - Left sidebar → Load Balancing → **Load Balancers**
   - Find: `beta-iriseller-com` (or similar name)
   - Click on it to select

### Step 4: Add Certificate to HTTPS Listener

1. **Go to Listeners Tab**:
   - Click on the **"Listeners"** tab
   - Find the listener for **HTTPS:443**

2. **Edit HTTPS Listener**:
   - Select the **HTTPS:443** listener
   - Click **"Actions"** → **"Manage certificates"**

3. **Add Certificate**:
   - Click **"Add certificates"**
   - Select the **salesos.org** certificate you just created
   - Click **"Add"**
   - Click **"Save"**

### Step 5: Add Listener Rule for salesos.org

1. **View/Edit Rules**:
   - Select the **HTTPS:443** listener
   - Click **"View/edit rules"**

2. **Add New Rule**:
   - Click the **"+"** icon (Insert Rule)
   - Or click **"Add rule"**

3. **Configure Rule Conditions**:
   - Click **"Add condition"** → **"Host header"**
   - Add values:
     - `salesos.org`
     - `www.salesos.org`
   - Click checkmark to confirm

4. **Configure Rule Actions**:
   - Click **"Add action"** → **"Forward to"**
   - Select your **target group** (same one used by beta.iriseller.com)
   - Priority: Set to a number (e.g., 10)

5. **Save Rule**:
   - Click **"Save"**
   - The rule should now appear in the list

### Step 6: Configure HTTP to HTTPS Redirect (Optional but Recommended)

1. **Edit HTTP Listener**:
   - Go back to **Listeners** tab
   - Select the **HTTP:80** listener
   - Click **"View/edit rules"**

2. **Add Redirect Rule for salesos.org**:
   - Click **"Add rule"**
   - Add condition → **"Host header"**:
     - `salesos.org`
     - `www.salesos.org`
   - Add action → **"Redirect to"**:
     - Protocol: **HTTPS**
     - Port: **443**
     - Status code: **301 - Permanently moved**
   - Click **"Save"**

---

## Part 3: Verify Target Group Configuration

### Step 7: Check Target Group Health

1. **Go to Target Groups**:
   - EC2 Console → Load Balancing → **Target Groups**
   - Select your target group

2. **Verify Targets**:
   - Click **"Targets"** tab
   - You should see your EC2 instance: `i-0c28f6efb2ad0f161`
   - Status should be **"healthy"**

3. **Check Health Check Settings**:
   - Click **"Health checks"** tab
   - Verify:
     - Protocol: **HTTP**
     - Port: **80**
     - Health check path: `/` or `/api/health`
     - Healthy threshold: **2-5**
     - Unhealthy threshold: **2**
     - Timeout: **5 seconds**
     - Interval: **30 seconds**

4. **Edit Health Check (if needed)**:
   - Click **"Edit health check settings"**
   - Update path to: `/api/health` (for better monitoring)
   - Click **"Save changes"**

---

## Part 4: Verify Security Groups

### Step 8: Check Load Balancer Security Group

1. **Go to Load Balancer Details**:
   - Select your load balancer
   - Click **"Security"** tab

2. **Verify Inbound Rules**:
   - Security group should allow:
     - Port **80** (HTTP) from **0.0.0.0/0** (anywhere)
     - Port **443** (HTTPS) from **0.0.0.0/0** (anywhere)

3. **Edit if Needed**:
   - Click on the security group ID
   - Click **"Edit inbound rules"**
   - Add missing rules
   - Click **"Save rules"**

### Step 9: Check EC2 Instance Security Group

1. **Go to EC2 Instances**:
   - EC2 Console → Instances
   - Find instance: `i-0c28f6efb2ad0f161`

2. **Check Security Group**:
   - Security group: `sg-03fe36c49e0c2ba68`
   - Click on it

3. **Verify Inbound Rules Allow**:
   - Port **80** from the **ALB security group** (sg-06275c321c4a61cd6)
   - If not present, add rule:
     - Type: **HTTP**
     - Port: **80**
     - Source: **ALB security group ID**

---

## Part 5: DNS Configuration Verification

### Step 10: Verify DNS Records

Make sure your DNS records are updated:

**In Cloudflare (or your DNS provider)**:

| Type | Name | Target | Proxy | TTL |
|------|------|--------|-------|-----|
| CNAME | @ (salesos.org) | beta-iriseller-com-262889512.us-east-1.elb.amazonaws.com | DNS Only | Auto |
| CNAME | www | beta-iriseller-com-262889512.us-east-1.elb.amazonaws.com | DNS Only | Auto |

**From command line**:
```bash
dig salesos.org +short
# Should return: 54.196.40.122 and 100.51.167.249

dig www.salesos.org +short
# Should return: beta-iriseller-com-262889512.us-east-1.elb.amazonaws.com
```

---

## Part 6: Testing & Verification

### Step 11: Test the Configuration

**Wait 5-10 minutes** for all changes to propagate, then test:

#### Test DNS Resolution
```bash
nslookup salesos.org
dig salesos.org +short
```

#### Test HTTP (should redirect to HTTPS)
```bash
curl -I http://salesos.org
# Should return: 301 Moved Permanently
# Location: https://salesos.org/
```

#### Test HTTPS
```bash
curl -I https://salesos.org
# Should return: 200 OK

curl -s https://salesos.org/api/health
# Should return: {"status":"healthy",...}
```

#### Test in Browser
1. Open: **https://salesos.org**
2. Verify:
   - ✅ Loads the SalesOS frontend
   - ✅ SSL certificate is valid (green padlock)
   - ✅ No console errors

---

## 🔍 Troubleshooting

### Certificate Not Validating
- **Issue**: Certificate stuck in "Pending validation"
- **Solution**:
  - Double-check CNAME records in DNS
  - Make sure Cloudflare proxy is OFF (gray cloud)
  - Wait up to 30 minutes

### 502 Bad Gateway Error
- **Issue**: ALB can't reach the application
- **Solutions**:
  - Check target group health status
  - Verify nginx is running: `sudo systemctl status nginx`
  - Verify PM2 services: `pm2 status | grep salesos`
  - Check security group allows traffic from ALB

### 503 Service Unavailable
- **Issue**: No healthy targets in target group
- **Solutions**:
  - Check EC2 instance is running
  - Verify health check path is correct
  - Check nginx is listening on port 80
  - Review target group health check logs

### SSL Certificate Error in Browser
- **Issue**: Certificate not trusted or wrong domain
- **Solutions**:
  - Verify certificate is attached to HTTPS listener
  - Check certificate covers salesos.org and www.salesos.org
  - Wait for certificate to fully provision (can take a few minutes)

### DNS Not Resolving to ALB IPs
- **Issue**: DNS still showing Cloudflare IPs
- **Solutions**:
  - Clear DNS cache: `sudo systemd-resolve --flush-caches`
  - Wait for DNS propagation (up to 48 hours)
  - Test with Google DNS: `nslookup salesos.org 8.8.8.8`
  - Check Cloudflare proxy is OFF

---

## 📊 Configuration Summary

After completing all steps:

| Component | Configuration |
|-----------|--------------|
| **SSL Certificate** | ACM certificate for salesos.org + www.salesos.org |
| **ALB Listener (443)** | Forwards salesos.org to target group |
| **ALB Listener (80)** | Redirects salesos.org HTTP → HTTPS |
| **Target Group** | Routes to EC2 instance port 80 |
| **Nginx** | Proxies /api → 5000, / → 5001 |
| **Backend** | Port 5000 (2 PM2 instances) |
| **Frontend** | Port 5001 (1 PM2 instance) |

---

## ✅ Expected Traffic Flow

```
User Browser
    ↓
https://salesos.org
    ↓
Application Load Balancer (HTTPS:443)
    ↓
EC2 Instance (HTTP:80)
    ↓
Nginx Reverse Proxy
    ↓
┌─────────────┬──────────────┐
│   /api/*    │      /       │
│      ↓      │      ↓       │
│  Backend    │  Frontend    │
│  Port 5000  │  Port 5001   │
└─────────────┴──────────────┘
```

---

## 📞 Quick Reference

**ALB DNS Name**: `beta-iriseller-com-262889512.us-east-1.elb.amazonaws.com`
**ALB IPs**: 54.196.40.122, 100.51.167.249
**Region**: us-east-1
**Instance ID**: i-0c28f6efb2ad0f161
**Nginx Config**: `/etc/nginx/sites-available/salesos.org`
**Backend Health**: `http://localhost:5000/api/health`
**Frontend**: `http://localhost:5001`

---

## 🎯 Next Steps

1. ✅ Follow Part 1 to request SSL certificate
2. ✅ Add DNS validation records to Cloudflare
3. ✅ Wait for certificate validation
4. ✅ Follow Part 2 to configure ALB listener rules
5. ✅ Follow Part 3-4 to verify target groups and security groups
6. ✅ Update DNS records to point to ALB (if not done already)
7. ✅ Test with Part 6 verification steps

---

**Need Help?**
- AWS ACM Documentation: https://docs.aws.amazon.com/acm/
- AWS ALB Documentation: https://docs.aws.amazon.com/elasticloadbalancing/
- Check logs: `sudo tail -f /var/log/nginx/salesos_access.log`
- Check backend: `pm2 logs salesos-backend`
