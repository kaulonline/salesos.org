# Quick Setup Checklist for salesos.org

## ☑️ Step-by-Step Checklist

### Phase 1: SSL Certificate (15-30 minutes)

- [ ] **1.1** Log into AWS Console (https://console.aws.amazon.com)
- [ ] **1.2** Go to Certificate Manager (ACM) in **us-east-1** region
- [ ] **1.3** Click "Request a certificate" → "Request a public certificate"
- [ ] **1.4** Add domains:
  - [ ] salesos.org
  - [ ] www.salesos.org
- [ ] **1.5** Choose "DNS validation"
- [ ] **1.6** Click "Request"
- [ ] **1.7** Copy the 2 CNAME validation records from ACM
- [ ] **1.8** Add CNAME records to Cloudflare DNS:
  - [ ] First validation CNAME (for salesos.org)
  - [ ] Second validation CNAME (for www.salesos.org)
  - [ ] **Important**: Set Proxy Status to "DNS Only" (gray cloud)
- [ ] **1.9** Wait for certificate status to change to "Issued" (5-30 mins)

---

### Phase 2: Update DNS to Point to ALB (5 minutes)

- [ ] **2.1** Log into Cloudflare
- [ ] **2.2** Select domain: salesos.org
- [ ] **2.3** Go to DNS → Records
- [ ] **2.4** Delete existing A records (104.21.62.91, 172.67.222.113)
- [ ] **2.5** Add CNAME record for root domain:
  - Type: CNAME
  - Name: @ (or salesos.org)
  - Target: `beta-iriseller-com-262889512.us-east-1.elb.amazonaws.com`
  - Proxy Status: **DNS Only** (gray cloud)
  - TTL: Auto
- [ ] **2.6** Add CNAME record for www:
  - Type: CNAME
  - Name: www
  - Target: `beta-iriseller-com-262889512.us-east-1.elb.amazonaws.com`
  - Proxy Status: **DNS Only** (gray cloud)
  - TTL: Auto
- [ ] **2.7** Save changes

---

### Phase 3: Configure ALB (10 minutes)

- [ ] **3.1** Go to EC2 Console in us-east-1
- [ ] **3.2** Navigate to Load Balancers (left sidebar)
- [ ] **3.3** Select: `beta-iriseller-com` load balancer

#### Add Certificate
- [ ] **3.4** Go to "Listeners" tab
- [ ] **3.5** Select HTTPS:443 listener
- [ ] **3.6** Click Actions → "Manage certificates"
- [ ] **3.7** Click "Add certificates"
- [ ] **3.8** Select the salesos.org certificate
- [ ] **3.9** Click "Add" then "Save"

#### Add Listener Rule
- [ ] **3.10** Select HTTPS:443 listener again
- [ ] **3.11** Click "View/edit rules"
- [ ] **3.12** Click "+" (Insert Rule) or "Add rule"
- [ ] **3.13** Add condition → "Host header":
  - [ ] salesos.org
  - [ ] www.salesos.org
- [ ] **3.14** Add action → "Forward to" → Select your target group
- [ ] **3.15** Set priority: 10
- [ ] **3.16** Click "Save"

#### Add HTTP Redirect (Optional but Recommended)
- [ ] **3.17** Go back to Listeners tab
- [ ] **3.18** Select HTTP:80 listener
- [ ] **3.19** Click "View/edit rules"
- [ ] **3.20** Click "Add rule"
- [ ] **3.21** Add condition → "Host header":
  - [ ] salesos.org
  - [ ] www.salesos.org
- [ ] **3.22** Add action → "Redirect to":
  - Protocol: HTTPS
  - Port: 443
  - Status code: 301
- [ ] **3.23** Click "Save"

---

### Phase 4: Verify Target Group (5 minutes)

- [ ] **4.1** Go to Target Groups (left sidebar)
- [ ] **4.2** Select your target group
- [ ] **4.3** Click "Targets" tab
- [ ] **4.4** Verify instance `i-0c28f6efb2ad0f161` is "healthy"
- [ ] **4.5** If unhealthy, check:
  - [ ] Nginx is running: `sudo systemctl status nginx`
  - [ ] PM2 services: `pm2 list | grep salesos`
  - [ ] Health check path is accessible

---

### Phase 5: Verify Security Groups (5 minutes)

#### ALB Security Group
- [ ] **5.1** Go to Load Balancer → Security tab
- [ ] **5.2** Click on security group ID
- [ ] **5.3** Verify inbound rules allow:
  - [ ] Port 80 from 0.0.0.0/0
  - [ ] Port 443 from 0.0.0.0/0

#### EC2 Instance Security Group
- [ ] **5.4** Go to EC2 Instances
- [ ] **5.5** Select instance: `i-0c28f6efb2ad0f161`
- [ ] **5.6** Click Security tab → Click security group
- [ ] **5.7** Verify inbound rule allows:
  - [ ] Port 80 from ALB security group (sg-06275c321c4a61cd6)

---

### Phase 6: Testing (10-15 minutes)

**Wait 10 minutes after completing all steps**, then test:

#### DNS Check
- [ ] **6.1** Run: `dig salesos.org +short`
  - [ ] Should show: 54.196.40.122 and 100.51.167.249
- [ ] **6.2** Run: `nslookup salesos.org`
  - [ ] Should resolve to ALB IPs

#### HTTP Test
- [ ] **6.3** Run: `curl -I http://salesos.org`
  - [ ] Should return: 301 redirect to HTTPS
- [ ] **6.4** Run: `curl -I http://www.salesos.org`
  - [ ] Should return: 301 redirect to HTTPS

#### HTTPS Test
- [ ] **6.5** Run: `curl -I https://salesos.org`
  - [ ] Should return: 200 OK
- [ ] **6.6** Run: `curl -s https://salesos.org/api/health`
  - [ ] Should return: `{"status":"healthy",...}`

#### Browser Test
- [ ] **6.7** Open browser: https://salesos.org
  - [ ] Page loads successfully
  - [ ] SSL certificate is valid (green padlock)
  - [ ] No console errors
- [ ] **6.8** Test login/functionality
  - [ ] Application works correctly

---

## 🚨 If Something Doesn't Work

### Certificate Not Validating
- Wait 30 minutes
- Check CNAME records in Cloudflare are correct
- Ensure Cloudflare proxy is OFF (gray cloud)

### DNS Not Resolving to ALB
- Wait up to 1 hour for DNS propagation
- Clear DNS cache: `sudo systemd-resolve --flush-caches`
- Try different DNS: `nslookup salesos.org 8.8.8.8`

### 502 Bad Gateway
- Check: `sudo systemctl status nginx`
- Check: `pm2 list`
- Check target group health in AWS Console

### SSL Certificate Error in Browser
- Verify certificate is attached to ALB HTTPS listener
- Check certificate includes salesos.org
- Wait 5 minutes after attaching certificate

---

## 📋 Quick Reference

**Your Details:**
- ALB Name: beta-iriseller-com
- ALB DNS: beta-iriseller-com-262889512.us-east-1.elb.amazonaws.com
- ALB IPs: 54.196.40.122, 100.51.167.249
- Region: us-east-1
- Instance: i-0c28f6efb2ad0f161
- Backend Port: 5000
- Frontend Port: 5001

**Current Status:**
- ✅ Nginx configured: /etc/nginx/sites-available/salesos.org
- ✅ Backend running: 2 instances on port 5000
- ✅ Frontend running: 1 instance on port 5001
- ⏳ DNS: Needs update to point to ALB
- ⏳ SSL: Needs certificate request and configuration
- ⏳ ALB: Needs listener rules added

---

## 📞 Commands for Verification

```bash
# Check local services
pm2 status | grep salesos
sudo systemctl status nginx
curl -s http://localhost:5000/api/health
curl -s http://localhost:5001

# Check DNS
dig salesos.org +short
nslookup salesos.org

# Check connectivity
curl -I http://salesos.org
curl -I https://salesos.org
curl -s https://salesos.org/api/health
```

---

## ✅ Success Criteria

You'll know it's working when:
1. DNS resolves to ALB IPs (54.196.40.122, 100.51.167.249)
2. https://salesos.org loads in browser with valid SSL
3. No console errors in browser developer tools
4. Backend API responds: https://salesos.org/api/health
5. Application is fully functional

**Estimated Total Time: 45-60 minutes**
(including waiting for certificate validation and DNS propagation)
