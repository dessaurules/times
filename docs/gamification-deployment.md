# Gamification System Deployment & Verification Guide

This guide provides step-by-step instructions for deploying the gamification system to local development and production environments, including comprehensive testing workflows and verification checklists.

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Dev Server Startup](#dev-server-startup)
3. [Testing Workflows](#testing-workflows)
4. [Production Deployment](#production-deployment)
5. [Rollback Plan](#rollback-plan)
6. [Monitoring & Support](#monitoring--support)
7. [Verification Checklist](#verification-checklist)

---

## Local Development Setup

Before starting the development servers, ensure PocketBase is running and the gamification system is properly initialized.

### 1. Start PocketBase

```bash
# From repository root
./pocketbase serve --http="127.0.0.1:8091"
```

This starts the PocketBase server on http://localhost:8091. The admin UI will be available at http://localhost:8091/_.

### 2. Verify Collections

Log into PocketBase admin UI and verify the following 7 collections exist:

- **gam_tasks** — Available tasks for employees
- **gam_assignments** — Task assignments (links users to tasks with expiration)
- **gam_submissions** — Task submissions with photo evidence
- **gam_approvals** — Approval status tracking
- **gam_rewards** — Reward catalog
- **gam_events** — Audit trail of all gamification events
- **gam_settings** — System configuration (enabled flag, etc.)

Also verify:
- **users.points** field exists with default value `0`

### 3. Verify API Rules

For each collection, check that API rules are properly configured:

- **gam_tasks:** Create/Read/Update/Delete rules as per implementation
- **gam_assignments:** Ensure users can only see/create their own assignments
- **gam_submissions:** Users can only submit for their own assignments
- **gam_approvals:** Only GF (admin) can approve submissions
- **gam_rewards:** Read available to all, create/update/delete restricted to GF
- **gam_events:** Read-only for authorized users, write via hooks
- **gam_settings:** Read allowed, write restricted to GF

### 4. Verify Indexes

Check that performance indexes are created in PocketBase admin UI → Collections → Indexes:

- **gam_assignments.user_id** — For fast user lookup
- **gam_assignments.expires_at** — For expiration checks
- **gam_events.user_id** — For activity feed queries
- **gam_submissions.assignment_id** — For submission tracking

### 5. Verify Hooks

Ensure `pb_hooks/gamification.pb.js` loads without errors:

```bash
# Check PocketBase logs for errors
# If hooks don't load, verify:
# - File exists at pb_hooks/gamification.pb.js
# - No syntax errors in the hook file
# - PocketBase has permission to read the file
```

---

## Dev Server Startup

Once PocketBase is running and verified, start the development servers in separate terminal windows.

### Terminal 1: Start Chef-App

```bash
cd chef-app
npm install  # Only needed on first setup
npm run dev
```

Chef-app will start at http://localhost:5173 with admin features for managing tasks, rewards, and approvals.

### Terminal 2: Start Mitarbeiter-App

```bash
cd mitarbeiter-app
npm install  # Only needed on first setup
npm run dev
```

Mitarbeiter-app will start at http://localhost:5174 (proxied to http://localhost:5173/ma/ for unified origin).

### Access the Applications

- **Chef-App:** http://localhost:5173
- **Mitarbeiter-App:** http://localhost:5173/ma/ (or directly at http://localhost:5174)
- **PocketBase Admin:** http://localhost:8091/_/

### SSO Verification

Once both apps are running, verify Single Sign-On works:

1. Login to chef-app with admin credentials (GF user)
2. Navigate to http://localhost:5173/ma/
3. Confirm you remain logged in (no redirect to /login)

This demonstrates that authentication tokens are shared via localStorage across the unified origin.

---

## Testing Workflows

Comprehensive testing procedures to verify the gamification system functions correctly before production deployment.

### Admin Setup Workflow

This workflow creates test data and enables the gamification system.

#### Step 1: Login as Admin

1. Open http://localhost:5173
2. Login with a user account that has `role = "gf"` (Geschäftsführer/Admin)
3. Verify you see the admin menu in the sidebar

#### Step 2: Navigate to Task Admin

1. Click **Admin** → **Gamification** → **Tasks** (or navigate to http://localhost:5173/admin/gamification/tasks)
2. Verify the task creation form is displayed

#### Step 3: Create Test Task

1. Fill in the form:
   - **Title:** "Clean Kitchen"
   - **Description:** "Deep clean the kitchen area including appliances"
   - **Points:** 50
   - **Requires Media:** Yes (toggle on)
   - **Category:** (optional) "Cleaning"

2. Click **Create Task**
3. Verify task appears in the task list with a unique ID

#### Step 4: Create Test Reward

1. Navigate to **Admin** → **Gamification** → **Rewards**
2. Fill in the form:
   - **Title:** "€10 Gutschein"
   - **Description:** "€10 voucher for employee use"
   - **Points Required:** 100
   - **Code Template:** "REWARD-{id}-{timestamp}"

3. Click **Create Reward**
4. Verify reward appears in the reward list

#### Step 5: Enable Gamification System

1. Navigate to **Admin** → **Gamification** → **Settings** (Einstellungen/Gamification)
2. Toggle **Enabled** to ON
3. Verify the setting is saved (check PocketBase admin if needed)

### User Testing Workflow

This workflow tests the complete user journey from task assignment to reward redemption.

#### Phase 1: Task Discovery & Assignment

1. Open a new private/incognito browser window
2. Navigate to http://localhost:5173/ma/
3. Login with a regular employee account (role = "ma")
4. Verify the **Diamant-Icon** appears in the top-right header
5. Verify the icon shows **0 points** (initial state)
6. Click the Diamant-Icon to open the gamification panel
7. Click the **"Verfügbare Aufgaben"** (Available Tasks) tab
8. Verify the "Clean Kitchen" test task appears
9. Click **"Annehmen"** (Accept) button on the task
10. Verify task moves to the **"Meine Aufgaben"** (My Tasks) tab
11. Verify an **8-hour countdown timer** starts next to the task
12. Verify the task title, description, and points are displayed

#### Phase 2: Task Submission

1. Click on the task to expand details
2. In the **"Meine Aufgaben"** tab, look for the task and click **"Abschließen"** (Complete)
3. A modal should open for photo upload:
   - Click **"Upload Photo"** or drag-and-drop an image
   - Verify the photo preview appears
   - Click **"Submit"** button
4. Verify submission is sent to backend
5. Verify the task moves to **"Eingereichte Aufgaben"** (Submitted Tasks) tab with pending status

#### Phase 3: Admin Approval

1. Switch back to the chef-app window (admin account)
2. Navigate to **Admin** → **Gamification** → **Approvals** (http://localhost:5173/admin/gamification/approvals)
3. Verify the submitted task appears in the approval queue
4. Verify the employee name, task title, and photo are visible
5. Click **"Genehmigen"** (Approve) button
6. Verify the approval is processed and the submission moves to approved status

#### Phase 4: Real-Time Points Update

1. Switch back to the employee's mitarbeiter-app window
2. Verify the Diamant-Icon in the header **immediately updates** to show **+50 points** (Real-Time)
3. The points should display as **50 points** without needing a page refresh
4. Click the Diamant-Icon to open the gamification panel
5. Verify the approved task now shows in the **"Gültige Aufträge"** (Completed Tasks) tab with ✓ status
6. Verify the **Activity Feed** shows the event: "Task approved: +50 points"

#### Phase 5: Reward Redemption

1. In the mitarbeiter-app, click the Diamant-Icon
2. Verify the **Rewards** tab shows available rewards
3. Create another test task (repeat Phase 1-4) or create a lower-points reward to test
4. Once the user has enough points, click **"Einlösen"** (Redeem) on a reward
5. Verify a modal asks for confirmation
6. Click **"Confirm"** to submit the redemption request
7. Verify the request appears in the chef-app **Admin** → **Gamification** → **Reward Orders** queue

#### Phase 6: Admin Approves Reward Order

1. In chef-app, navigate to **Admin** → **Gamification** → **Reward Orders**
2. Verify the employee's redemption request appears
3. Click **"Genehmigen"** (Approve) button
4. A reward code should be generated (e.g., "REWARD-123-abc456")
5. Verify the code is displayed to the admin

#### Phase 7: Verify Reward in Employee App

1. Switch back to mitarbeiter-app
2. Verify the reward order now shows in **"Eingelöste Rewards"** (Redeemed Rewards) tab
3. Verify the reward code is visible to the employee
4. Verify the points have been deducted: **previous_points - reward_cost = new_points**

---

## Production Deployment

This section covers building and deploying the gamification system to the production environment.

### Prerequisites

- SSH access to the production server (192.168.178.106)
- All code committed to the development/main branches
- All tests passing locally

### Build Process

Build both applications with production configuration:

```bash
# Build chef-app
cd chef-app
npm run build

# Build mitarbeiter-app
cd ../mitarbeiter-app
npm run build
```

Both builds will:
- Run TypeScript type checking
- Optimize assets for production
- Generate static files in `dist/` directories

Verify no build errors appear. If builds fail, fix the errors before proceeding.

### Deploy Using Deploy Script

From the repository root, run the deployment script:

```bash
./deploy.sh
```

This script will:

1. Verify git status and pull latest changes
2. Rebuild both apps with `VITE_PB_URL` pointing to production PocketBase
3. Restart systemd services:
   - `pb-service` — PocketBase backend
   - `push-service` — Web Push notification service
   - `serve-app` — Unified server (serve.mjs) for both apps

### Verify Production Deployment

Once the deploy script completes, verify the system is running:

```bash
# SSH into production server
ssh server@192.168.178.106

# Check service status
systemctl status pb-service
systemctl status push-service
systemctl status serve-app

# Exit SSH
exit
```

### Access Production URLs

- **Chef-App:** http://192.168.178.106:3001/
- **Mitarbeiter-App:** http://192.168.178.106:3001/ma/
- **PocketBase Admin:** http://192.168.178.106:8092/_/
- **SSH Tunnel (optional):** `ssh -L 3001:localhost:3001 server@192.168.178.106` → http://localhost:3001

### Production Testing

Repeat the [User Testing Workflow](#user-testing-workflow) on production URLs to verify functionality:

1. Login with production credentials
2. Create test task and reward
3. Complete the full workflow (assignment → submission → approval → points → redemption)
4. Verify all real-time updates work

---

## Rollback Plan

If critical issues arise after deployment, use one of the following rollback strategies.

### Option 1: Quick Disable (Graceful)

Disable the gamification system without reverting code:

1. SSH into the production server: `ssh server@192.168.178.106`
2. Open PocketBase admin: http://192.168.178.106:8092/_/
3. Navigate to the `gam_settings` collection
4. Set `enabled = false`
5. Verify the gamification UI is hidden in both apps (Diamant-Icon disappears)

This approach keeps all data intact and allows debugging without affecting users.

### Option 2: Full Rollback (if code has bugs)

Revert the commit and redeploy:

```bash
# On your local machine, revert the commit
git revert HEAD

# Push to remote
git push origin development

# SSH to production server
ssh server@192.168.178.106

# Pull changes and redeploy
cd /path/to/times
git pull
./deploy.sh
```

### Option 3: Manual Service Restart

If the deploy script fails:

```bash
ssh server@192.168.178.106

# Manually restart services
systemctl restart pb-service
systemctl restart push-service
systemctl restart serve-app

# Check logs for errors
journalctl -u serve-app -n 50
journalctl -u pb-service -n 50
```

---

## Monitoring & Support

### Monitoring Gamification Events

All gamification actions are logged in the `gam_events` collection for audit and debugging purposes.

#### Monitor via PocketBase Admin

1. Open PocketBase admin UI: http://192.168.178.106:8092/_/ (production) or http://localhost:8091/_ (dev)
2. Navigate to **Collections** → **gam_events**
3. Verify recent events appear (sorted by timestamp):
   - **assignment_created** — User accepted a task
   - **submission_created** — User submitted a task with photo
   - **approval_approved** — Admin approved a submission
   - **points_awarded** — Points added to user account
   - **reward_redeemed** — User redeemed a reward
   - **reward_order_approved** — Admin approved a reward order

#### Check for Hook Errors

If tasks or points are not updating:

1. SSH into production: `ssh server@192.168.178.106`
2. Check PocketBase logs for hook errors:

```bash
journalctl -u pb-service | grep -i error
```

3. Common issues:
   - Hook file permissions (ensure `pb_hooks/gamification.pb.js` is readable)
   - Syntax errors in hook code (check PocketBase logs)
   - Database connection issues (check PocketBase status)

### Track User Points Changes

Monitor user points to detect anomalies:

```bash
# Via PocketBase Admin UI:
# 1. Collections → users
# 2. Search for user by email or name
# 3. View the "points" field
# 4. Check if changes correlate with approved tasks
```

### Known Limitations

The current gamification system has the following limitations documented for future enhancements:

- **No External Code API** — External systems cannot trigger gamification events; use PocketBase UI or apps only
- **No Leaderboards** — System does not display top users or rankings yet
- **No Badges** — No achievement badges or milestone tracking implemented
- **No Scheduled Tasks** — Tasks cannot be scheduled to appear at specific times
- **No Bulk Operations** — Admin UI does not support bulk task/reward creation

These features may be added in future releases.

### Support & Troubleshooting

#### Gamification UI not appearing in mitarbeiter-app

- Check if `gam_settings.enabled = true` in PocketBase
- Verify user is logged in (check localStorage for token)
- Clear browser cache and reload

#### Tasks not appearing in Available Tasks

- Verify tasks exist in `gam_tasks` collection
- Check task `active` flag is true
- Verify current date is between `start_date` and `end_date` (if set)

#### Points not updating after approval

- Check PocketBase logs for hook errors
- Verify `gam_settings.enabled = true`
- Manually verify `users.points` in PocketBase admin

#### Photos not uploading

- Check file size is under 10MB (if limit set)
- Verify file format is supported (jpg, png, etc.)
- Check PocketBase `lager` (storage) collection has space

---

## Verification Checklist

Use this checklist to ensure the gamification system is fully functional before and after deployment.

### Pre-Deployment Checklist

- [ ] PocketBase collections created (7 total: gam_tasks, gam_assignments, gam_submissions, gam_approvals, gam_rewards, gam_events, gam_settings)
- [ ] users.points field exists with default value 0
- [ ] API-rules set correctly per collection (create, read, update, delete rules)
- [ ] Indexes created for performance (user_id, expires_at on key collections)
- [ ] pb_hooks/gamification.pb.js loads without errors (check PocketBase logs)
- [ ] Chef-app builds successfully (`npm run build` — no TypeScript errors)
- [ ] Mitarbeiter-app builds successfully (`npm run build` — no TypeScript errors)
- [ ] All tests pass locally (`npm run test:run` in both apps)

### Dev Functionality Checklist

- [ ] Chef-app admin pages load (/admin/gamification/tasks, /admin/gamification/rewards, /admin/gamification/settings)
- [ ] Mitarbeiter-app header shows Diamant-Icon with points (initially 0)
- [ ] Task assignment works (clicking "Annehmen" creates assignment and sets expires_at to now + 8h)
- [ ] Task submission with photo works (photo uploads and submission is created)
- [ ] Admin approval awards points to user (points field updated in users collection)
- [ ] Real-time updates work (points display updates immediately without page refresh)
- [ ] Activity feed shows events (assignment, submission, approval, points awarded)
- [ ] Reward redemption deducts points (points field decremented on successful redemption)
- [ ] System disable (gam_settings.enabled=false) hides UI (Diamant-Icon disappears from header)

### Production Deployment Checklist

- [ ] Production build successful (both apps build without errors)
- [ ] Deploy script completes without errors (./deploy.sh finishes successfully)
- [ ] PocketBase running on production (http://192.168.178.106:8092 accessible)
- [ ] Chef-app accessible on production (http://192.168.178.106:3001 loads)
- [ ] Mitarbeiter-app accessible on production (http://192.168.178.106:3001/ma/ loads)
- [ ] Login works on production (admin can login to chef-app, employee can login to mitarbeiter-app)
- [ ] Gamification admin pages load on production (/admin/gamification/* pages accessible)
- [ ] Real-time gamification works on production (points update without refresh, activity feed updates live)
- [ ] All systemd services running (pb-service, push-service, serve-app active)

### Post-Deployment Sign-Off

- [ ] All checklists completed
- [ ] Production testing passed (full workflow tested: assignment → submission → approval → points → redemption)
- [ ] No errors in PocketBase logs
- [ ] No errors in service logs (journalctl -u serve-app, etc.)
- [ ] Stakeholders notified of successful deployment
- [ ] Rollback plan documented and accessible to on-call team

---

## Quick Reference

### Key Directories

- **Frontend (Chef-App):** `/chef-app/src/pages/` and `/chef-app/src/components/Gamification/`
- **Frontend (Mitarbeiter-App):** `/mitarbeiter-app/src/pages/Dashboard.tsx` and `/mitarbeiter-app/src/components/Gamification/`
- **Backend Hooks:** `/pb_hooks/gamification.pb.js`
- **Database Migrations:** `/pb_migrations/` (gamification collections)
- **Documentation:** `/docs/gamification-*.md`

### Key Collections

| Collection | Purpose |
|-----------|---------|
| gam_tasks | Available tasks for employees |
| gam_assignments | User → Task assignments with 8h expiration |
| gam_submissions | Task submissions with photo evidence |
| gam_approvals | Approval status tracking |
| gam_rewards | Reward catalog |
| gam_events | Audit trail of all actions |
| gam_settings | System configuration |

### Commands

```bash
# Local development
./pocketbase serve --http="127.0.0.1:8091"
cd chef-app && npm run dev
cd mitarbeiter-app && npm run dev

# Production deployment
./deploy.sh

# Check services
systemctl status pb-service
systemctl status push-service
systemctl status serve-app

# Rollback (disable system)
# SSH to server and set gam_settings.enabled = false in PocketBase admin
```

---

## Contact & Escalation

For issues or questions regarding gamification system deployment:

1. **Technical Issues:** Check PocketBase logs and this guide's Troubleshooting section
2. **Data Issues:** Review gam_events collection for audit trail
3. **Deployment Issues:** Follow the Rollback Plan section
4. **Feature Requests:** Document in issue tracker and reference Known Limitations section

**Last Updated:** August 2026
