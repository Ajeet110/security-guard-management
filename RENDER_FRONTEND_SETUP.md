# 🚀 Render Frontend Setup - Step by Step

## 📋 Quick Setup (5 Minutes)

---

## Step 1: Go to Render Dashboard

1. **Open:** https://dashboard.render.com/
2. **Click:** "New +" (top right corner)
3. **Select:** "Static Site"

---

## Step 2: Connect Repository

1. **Click:** "Connect a repository"
2. **Select:** Your GitHub repository (same as backend)
3. **Click:** "Connect"

---

## Step 3: Configure Static Site

Fill in these details:

### Basic Settings

**Name:**
```
secureguard-frontend
```

**Branch:**
```
master
```
(or `main` if that's your default branch)

**Root Directory:**
```
client
```

**Build Command:**
```
npm install && npm run build
```

**Publish Directory:**
```
build
```

---

### Advanced Settings

Click **"Advanced"** button

#### Environment Variables

Add these two variables:

**Variable 1:**
- **Key:** `REACT_APP_API_URL`
- **Value:** `https://security-guard-management-ffxs.onrender.com`

**Variable 2:**
- **Key:** `REACT_APP_SOCKET_URL`
- **Value:** `https://security-guard-management-ffxs.onrender.com`

**Variable 3:**
- **Key:** `NODE_ENV`
- **Value:** `production`

**Variable 4:**
- **Key:** `GENERATE_SOURCEMAP`
- **Value:** `false`

---

### Auto-Deploy

- **Auto-Deploy:** Yes (enabled by default)

---

## Step 4: Create Static Site

1. **Click:** "Create Static Site" (bottom)
2. **Wait:** 2-3 minutes for build and deploy

---

## Step 5: Get Your Frontend URL

After deployment completes:

1. **Copy the URL** from dashboard
   - Format: `https://secureguard-frontend.onrender.com`
   - Or custom name you chose

---

## Step 6: Update Backend CORS

Now update backend to allow frontend:

1. **Go to backend service** in Render dashboard
2. **Click:** "Environment" tab
3. **Find:** `CLIENT_URL` variable
4. **Update value to your frontend URL:**
   ```
   https://secureguard-frontend.onrender.com
   ```
5. **Click:** "Save Changes"

Backend will automatically redeploy (1-2 minutes)

---

## Step 7: Update Frontend API URL (If Needed)

If you want frontend to use its own backend URL:

1. **Go to frontend service** in Render dashboard
2. **Click:** "Environment" tab
3. **Verify:** `REACT_APP_API_URL` is set correctly
4. If changed, click "Save" and redeploy

---

## ✅ Verification

### Test Frontend
Open your frontend URL:
```
https://secureguard-frontend.onrender.com
```

Should show login page ✅

### Test Backend Connection
1. Open frontend
2. Try to login
3. Check browser console (F12)
4. Should see API calls to backend ✅

### Test Complete Flow
1. Login with owner credentials
2. Check dashboard loads
3. Try chat, attendance, etc.
4. Everything should work ✅

---

## 🎯 Your Complete Setup

### Frontend (Static Site)
- **URL:** `https://secureguard-frontend.onrender.com`
- **Type:** Static Site
- **Auto-Deploy:** Yes
- **Build Time:** ~2 minutes

### Backend (Web Service)
- **URL:** `https://security-guard-management-ffxs.onrender.com`
- **Type:** Web Service
- **Auto-Deploy:** Yes
- **Persistent Disk:** Configured

---

## 🔄 Auto-Deployment

Now when you push to GitHub:

```bash
git add .
git commit -m "Updates"
git push origin master
```

**Render automatically:**
1. ✅ Rebuilds frontend (if client/ changed)
2. ✅ Redeploys backend (if server/ changed)
3. ✅ Both live in 2-3 minutes

---

## 💰 Cost

| Service | Cost |
|---------|------|
| Frontend (Static Site) | ₹0 (100GB bandwidth/month) |
| Backend (Web Service) | ₹0 (750 hours/month) |
| Persistent Disk | ₹0 (included) |
| **Total** | **₹0/month** 🎉 |

---

## 🔧 Custom Domain (Optional)

### Add Custom Domain to Frontend

1. **Frontend service → Settings**
2. **Custom Domains section**
3. **Click:** "Add Custom Domain"
4. **Enter:** your domain (e.g., `app.yourdomain.com`)
5. **Add DNS records** as shown
6. **Wait:** 5-30 minutes for SSL

### Add Custom Domain to Backend

1. **Backend service → Settings**
2. **Custom Domains section**
3. **Click:** "Add Custom Domain"
4. **Enter:** your domain (e.g., `api.yourdomain.com`)
5. **Add DNS records** as shown
6. **Update:** `REACT_APP_API_URL` in frontend to new domain

---

## 📊 Monitoring

### Render Dashboard
- **Deployments:** History and logs
- **Metrics:** Bandwidth, requests
- **Logs:** Real-time logs
- **Events:** Build and deploy events

### UptimeRobot (Setup Next)
- **Frontend:** Monitor uptime
- **Backend:** Monitor uptime
- **Alerts:** Email notifications

---

## 🐛 Troubleshooting

### Build Failed
**Check:**
- Build logs in Render dashboard
- `client/package.json` has all dependencies
- Build command is correct

### Frontend Shows Blank Page
**Check:**
- Browser console for errors
- Publish directory is `build`
- Build completed successfully

### API Not Connecting
**Check:**
- `REACT_APP_API_URL` is correct
- Backend is running
- CORS is configured (CLIENT_URL)

### 404 on Routes
**Check:**
- Rewrite rules are configured
- All routes redirect to `/index.html`

---

## ✅ Success Checklist

- [ ] Static site created on Render
- [ ] Build completed successfully
- [ ] Frontend URL accessible
- [ ] Environment variables set
- [ ] Backend CLIENT_URL updated
- [ ] Login works
- [ ] All features working
- [ ] UptimeRobot setup (next step)

---

## 🎊 Next Step: UptimeRobot

After frontend is live, setup UptimeRobot:

### Monitor 1: Frontend
- **URL:** `https://secureguard-frontend.onrender.com`
- **Interval:** 5 minutes

### Monitor 2: Backend
- **URL:** `https://security-guard-management-ffxs.onrender.com/api/health`
- **Interval:** 5 minutes

This keeps both services always awake! ✅

---

## 📞 Support

- **Render Docs:** https://render.com/docs/static-sites
- **Your Backend:** https://security-guard-management-ffxs.onrender.com
- **Render Dashboard:** https://dashboard.render.com/

---

**Follow these steps and your frontend will be live on Render!** 🚀

**After setup, tell me your frontend URL!** 🎉
