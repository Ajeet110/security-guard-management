# 🚀 Render Backend Setup Instructions

## ⚠️ Important: Update These Settings on Render

### Step 1: Add Environment Variable on Render

1. **Go to Render Dashboard:** https://dashboard.render.com/
2. **Click your web service** (backend service)
3. **Go to "Environment" tab**
4. **Add this new variable:**

```
Key: CLIENT_URL
Value: https://security-guard-managemen-d593d.web.app
```

5. **Click "Save Changes"**
6. **Service will automatically redeploy** (wait 2-3 minutes)

---

### Step 2: Push Updated CORS Code to Git

Your server code has been updated with Firebase URLs. Push to Git:

```bash
git add server/index.js
git commit -m "Update CORS for Firebase hosting"
git push origin main
```

Render will automatically detect the push and redeploy.

---

### Step 3: Verify Backend is Running

After deployment completes, test your backend:

```
https://your-render-app-name.onrender.com/api/health
```

Should return:
```json
{
  "status": "ok",
  "message": "SecureGuard Connect API is running",
  "healthy": true
}
```

---

## 📋 Complete Environment Variables on Render

Make sure these are all set:

```env
PORT=5000
JWT_SECRET=0cce2ae379f93dd8bb0a35124b7df36ef4256a9d0cc2b74c4d848e0b03efc75665d1ed04a53ec134cb6175fd552af175177b31f77cd25c8337809df1d8878a44
JWT_REFRESH_SECRET=0dc504010783a3c8fb8b583c1de6635ae62f904c2b26c4600410c4cc9dad8664d01d8a137f91f8b29fbb09db05698cc72e4e0719bbf33f22cf94e8749fed2b29
NODE_ENV=production
CLIENT_URL=https://security-guard-managemen-d593d.web.app
DATABASE_URL=/opt/render/project/persistent/secureguard.db
UPLOADS_DIR=/opt/render/project/persistent/uploads
```

---

## ✅ After Render Setup is Complete

Once Render backend is updated and running, come back and provide your Render URL.

Then we'll connect the Firebase frontend to your Render backend.

---

## 🔗 Your URLs

- **Frontend (Firebase):** https://security-guard-managemen-d593d.web.app
- **Backend (Render):** https://your-app-name.onrender.com (provide this)

---

## 📞 Next Step

After completing Render setup, tell me your Render backend URL, and I'll complete the final connection!
