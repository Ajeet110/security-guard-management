# 🔧 Render Database Persistence Fix

## Problem
Your database keeps getting cleared on Render because SQLite files are stored on Render's **ephemeral file system**, which gets wiped on every restart/redeploy.

## Solution: Enable Render Disk (Persistent Storage)

### Step 1: Verify Render Disk Configuration

1. Go to your Render Dashboard: https://dashboard.render.com
2. Click on your service: **secureguard-connect**
3. Go to **"Disks"** tab in the left sidebar
4. Check if a disk named **"data"** exists with mount path `/opt/render/project/src`

### Step 2: If Disk Doesn't Exist, Create It

If you don't see the disk:

1. Click **"Add Disk"** button
2. Fill in:
   - **Name**: `data`
   - **Mount Path**: `/opt/render/project/src`
   - **Size**: `1 GB` (free tier allows up to 1GB)
3. Click **"Save"**
4. Your service will restart automatically

### Step 3: Verify Environment Variables

Go to **"Environment"** tab and ensure these are set:

```
DATABASE_URL=/opt/render/project/src/server/database/secureguard.db
UPLOADS_DIR=/opt/render/project/src/uploads
```

### Step 4: Redeploy

1. Go to **"Manual Deploy"** → **"Deploy latest commit"**
2. Wait for deployment to complete
3. Check logs to verify database is being saved to persistent disk

## How to Verify It's Working

### Method 1: Check Logs
After deployment, check logs for:
```
✅ Database initialized successfully
📁 Database directory: /opt/render/project/src/server/database
```

### Method 2: Test Persistence
1. Create a test user in your app
2. Go to Render Dashboard → Click **"Manual Deploy"** → **"Clear build cache & deploy"**
3. After redeployment, check if the test user still exists
4. If user exists = ✅ Persistence working!
5. If user is gone = ❌ Disk not properly configured

### Method 3: Use Debug Endpoint
Visit: `https://your-app-name.onrender.com/api/debug`

This will show:
- User count
- Database path
- Write test results
- System information

## Important Notes

### ⚠️ Render Free Tier Limitations
- **1 GB disk space** (sufficient for small-medium apps)
- **Service sleeps after 15 minutes of inactivity**
- **Disk persists even when service is sleeping** ✅
- **Disk survives redeployments** ✅

### 🔄 What Triggers Data Loss (Without Persistent Disk)
- Manual deployments
- Auto-deployments from GitHub
- Service restarts
- Inactivity sleep/wake cycles
- Build cache clearing

### ✅ What's Safe (With Persistent Disk)
- All of the above! Your data persists through everything

## Alternative: Migrate to PostgreSQL (Recommended for Production)

For better performance and reliability, consider migrating to PostgreSQL:

### Option 1: Render PostgreSQL (Free Tier Available)
- 90-day free trial
- 256 MB RAM
- 1 GB storage
- Automatic backups

### Option 2: External PostgreSQL
- Supabase (free tier: 500 MB)
- ElephantSQL (free tier: 20 MB)
- Neon (free tier: 3 GB)

**Migration would require code changes** - let me know if you want to migrate to PostgreSQL.

## Troubleshooting

### Issue: Disk Not Showing Up
**Solution**: Render free tier might have limits. Check:
1. Dashboard → Account Settings → Usage
2. Ensure you haven't exceeded free tier limits

### Issue: Database Still Clearing
**Solution**: 
1. Verify mount path is exactly: `/opt/render/project/src`
2. Check DATABASE_URL matches the mount path
3. Ensure disk is attached to the correct service

### Issue: "Permission Denied" Errors
**Solution**: Render automatically handles permissions for mounted disks. If you see this:
1. Check if disk is properly mounted
2. Verify the mount path in environment variables

## Current Configuration Status

Your `render.yaml` already has the disk configuration:
```yaml
disk:
  name: data
  mountPath: /opt/render/project/src
  sizeGB: 1
```

This means the disk **should** be created automatically. If it's not working:
1. The disk might not have been created during initial deployment
2. You may need to manually add it through the dashboard

## Next Steps

1. ✅ Check if disk exists in Render Dashboard
2. ✅ If not, create it manually (Step 2 above)
3. ✅ Verify environment variables
4. ✅ Redeploy and test
5. ✅ Verify persistence using test user method

---

**Need Help?** If the disk still doesn't work after following these steps, you may need to:
- Contact Render support
- Or migrate to PostgreSQL (I can help with this)
