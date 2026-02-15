# Admin UI - Complete Guide

**Date**: February 14, 2026
**Updated**: Enhanced to show dual-role system

---

## 📍 Location

**Primary URL**: `https://salesos.org/dashboard/admin`

**Alternate URLs**:
- `/dashboard/admin` (with query params like `?tab=users`)
- `/admin` (direct admin routes)

---

## 🔐 Access Requirements

**Who Can Access**:
- Users with **system role = ADMIN** (Super Admins)
- Users with **system role = MANAGER** (Limited access)

**Permission Levels**:

| Role | Access Level | Can View |
|------|-------------|----------|
| **ADMIN** | Full access | All organizations, all users, all settings |
| **MANAGER** | Limited access | Only their organization's users, read-only features |
| **USER/VIEWER** | ❌ No access | Redirected/blocked |

---

## 📊 Available Tabs

### 1. Overview
**What it shows**:
- System statistics dashboard
- Total users, conversations, meetings
- CRM data (leads, opportunities, accounts, contacts)
- AI usage metrics (tokens, response time, success rate)
- System health (uptime, version, last backup)

### 2. Users ⭐ **Enhanced**
**What it shows** (after enhancement):
- **System Role** - ADMIN/MANAGER/USER/VIEWER (system-wide permissions)
- **Organization** - Which organization the user belongs to
- **Org Role** - OWNER/ADMIN/MANAGER/MEMBER (organization-specific permissions)
- User status (ACTIVE/SUSPENDED/PENDING)
- Last login date
- User email and name

**Features**:
- Search users by name or email
- Filter by system role
- Filter by status
- Suspend/activate users
- Reset passwords
- Edit user details

**Visual Indicators**:
- ⭐ = System ADMIN (super admin with cross-org access)
- 👑 = Organization OWNER (can delete the organization)
- Organization name displayed clearly

### 3. Organizations
**What it shows**:
- List of all organizations
- Organization status
- Member counts
- Organization details

**Features**:
- Create new organizations
- Edit organization details
- View organization members
- Generate invitation codes
- Manage organization settings

### 4. Access Requests
**What it shows**:
- Inbound access requests from website forms
- AI-scored leads
- Request status (PENDING, CONTACTED, QUALIFIED, APPROVED, REJECTED)
- Company and contact information

**Features**:
- Review and qualify requests
- Send organization codes
- Convert to leads
- AI re-enrichment

### 5. Billing
**What it shows**:
- Outcome-based pricing dashboard
- Pricing plans
- Billing events
- Invoices
- Payment transactions

### 6. Features
**What it shows**:
- Feature flags
- System-wide feature toggles
- Rollout configurations

### 7. Settings
**What it shows**:
- System configurations
- OAuth settings (Google, Apple)
- Payment gateway configs
- Maintenance mode
- AI configuration

### 8. Audit
**What it shows**:
- Audit logs of all admin actions
- User activity
- System changes
- Security events

### 9. Backups
**What it shows**:
- Database backups
- Backup schedules
- Restore options
- Backup statistics

---

## 🎯 How Super Admins View Everything

### Option 1: Via Admin UI (Recommended)

**Access URL**: `https://salesos.org/dashboard/admin?tab=users`

**What you see**:
```
╔═══════════════════════════════════════════════════════════════════════╗
║ User          │ System Role  │ Organization      │ Org Role  │ Status║
╠═══════════════════════════════════════════════════════════════════════╣
║ admin@iris... │ ADMIN ⭐     │ Acme Corporation │ OWNER 👑  │ ACTIVE ║
║ jchen@iris... │ MANAGER      │ Acme Corporation │ ADMIN     │ ACTIVE ║
║ manager@ir... │ MANAGER      │ Acme Corporation │ MANAGER   │ ACTIVE ║
╚═══════════════════════════════════════════════════════════════════════╝
```

**Key Features**:
- See ALL users across ALL organizations (if you're ADMIN)
- Both system role and organization role displayed
- Organization name shown for context
- Quick actions: suspend, activate, reset password

### Option 2: Via API

**Endpoint**: `GET /api/admin/users`

```bash
curl -H "Authorization: Bearer <token>" \
  "https://salesos.org/api/admin/users?page=1&pageSize=20"
```

**Response includes**:
```json
{
  "items": [
    {
      "id": "user-123",
      "email": "admin@iriseller.com",
      "name": "Admin User",
      "role": "ADMIN",              // System role
      "status": "ACTIVE",
      "organizationId": "org-456",
      "organizationName": "Acme Corporation",
      "organizationRole": "OWNER"   // Organization role
    }
  ],
  "total": 7,
  "page": 1,
  "totalPages": 1
}
```

### Option 3: Via TypeScript Script

```bash
cd /opt/salesos.org/api
npx ts-node scripts/check-users.ts
```

**Shows**:
- Specific users and their roles
- System super admins
- Organization memberships
- Role breakdowns

### Option 4: Via SQL Queries

```bash
cd /opt/salesos.org/api
# Run queries from check-organization-users.sql
```

---

## 🔍 Understanding the Dual-Role System

### System Roles (User.role)
**Controls**: System-wide permissions

- **ADMIN** ⭐ - Super admin with access to ALL organizations
- **MANAGER** - Limited admin access (only their org)
- **USER** - Regular user (single org access)
- **VIEWER** - Read-only access

### Organization Roles (OrganizationMember.role)
**Controls**: Permissions WITHIN an organization

- **OWNER** 👑 - Full control, can delete organization
- **ADMIN** - Manage members, settings, CRM imports
- **MANAGER** - Manage team, view reports
- **MEMBER** - Standard user access

### Example Combinations

```
System ADMIN + Org OWNER  = Highest privilege (everything)
System ADMIN + Org ADMIN  = Very high (super admin + org admin)
System USER  + Org OWNER  = High (org owner, one org only)
System USER  + Org ADMIN  = Medium-high (org admin, one org only)
System USER  + Org MANAGER = Medium (team manager)
System USER  + Org MEMBER  = Standard (regular user)
```

---

## ✨ Recent Enhancements

### What Was Changed (February 14, 2026)

**Problem**:
- Admin UI only showed system roles (ADMIN, MANAGER, USER)
- Organization membership information was hidden
- Couldn't see which organization a user belonged to
- Couldn't see organization-specific roles

**Solution**:
1. Updated AdminUser TypeScript interface to include:
   - `organizationId`
   - `organizationName`
   - `organizationRole`

2. Enhanced Users table in Admin UI:
   - Added "Organization" column
   - Added "Org Role" column
   - Renamed "Role" to "System Role" for clarity
   - Added visual indicators (⭐ for super admin, 👑 for owner)

3. Backend already supported this data - just needed frontend updates!

**Files Modified**:
- `/opt/salesos.org/src/api/admin.ts` - Updated AdminUser interface
- `/opt/salesos.org/pages/dashboard/Admin.tsx` - Updated Users table

---

## 📋 Quick Reference

### Check Specific Users
```bash
cd /opt/salesos.org/api
npx ts-node scripts/check-users.ts
```

### View All Organizations
```bash
curl -H "Authorization: Bearer <token>" \
  "https://salesos.org/api/admin/organizations"
```

### View Organization Members
```bash
curl -H "Authorization: Bearer <token>" \
  "https://salesos.org/api/organizations/<org-id>/members"
```

### Find Super Admins
```sql
SELECT id, email, name, role, status
FROM users
WHERE role = 'ADMIN' AND status = 'ACTIVE';
```

---

## 🎓 For Managers vs Super Admins

### If You're a MANAGER (Limited Access)

**What you see in Admin UI**:
- Only users from YOUR organization
- Limited settings access
- No cross-organization visibility
- Read-only feature flags

**Your permissions**:
- View users in your org
- Basic reporting
- Cannot create/delete users
- Cannot access other organizations

### If You're an ADMIN (Super Admin)

**What you see in Admin UI**:
- ALL users across ALL organizations
- Full system settings
- Cross-organization data
- All feature flags
- Full backup access
- Maintenance mode control

**Your permissions**:
- Create/edit/delete users
- Manage all organizations
- System configuration
- Database operations
- Security settings

---

## 🔒 Security Features

1. **Organization Isolation**
   - Managers can only see their organization
   - Super admins can see all organizations
   - Data is automatically scoped

2. **Action Logging**
   - All admin actions are logged in Audit tab
   - Includes user, action, timestamp, IP address

3. **Role Validation**
   - Backend enforces role-based access
   - Guards prevent unauthorized access

---

## 📚 Related Documentation

- **User Role Hierarchy**: `/opt/salesos.org/USER_ROLE_HIERARCHY_GUIDE.md`
- **Current User State**: `/opt/salesos.org/CURRENT_USER_STATE_SUMMARY.md`
- **Security Details**: `/opt/salesos.org/DATA_IMPORT_SECURITY.md`
- **SQL Queries**: `/opt/salesos.org/api/scripts/check-organization-users.sql`

---

## Summary

✅ **Admin UI exists at `/dashboard/admin`**
✅ **Shows comprehensive user and organization data**
✅ **Displays both system roles and organization roles**
✅ **Visual indicators for super admins (⭐) and owners (👑)**
✅ **Super admins can see ALL users across ALL organizations**
✅ **Managers see only their organization's users**
✅ **Multiple ways to view data: UI, API, scripts, SQL**

**The Admin UI is now complete and shows everything a super admin needs!** 🎉

---

**Last Updated**: February 14, 2026
**By**: Claude Code
**Status**: ✅ Production Ready
