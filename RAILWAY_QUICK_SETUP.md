# 🚂 Railway - Quick Setup (5 Minutes)

## ✅ What You Need to Do

### Step 1: Push to GitHub (If Not Already)

```bash
git push origin master
```

Agar GitHub repo nahi hai, to pehle create karo: https://github.com/new

---

### Step 2: Railway Account

1. **Go to:** https://railway.app/
2. **Click:** "Start a New Project"
3. **Login with GitHub**
4. ✅ You get **$5 free credit**

---

### Step 3: Deploy

1. **Click:** "New Project"
2. **Select:** "Deploy from GitHub repo"
3. **Choose:** Your repository
4. **Click:** "Deploy Now"

Railway will automatically:
- ✅ Detect Node.js
- ✅ Install dependencies
- ✅ Start server
- ✅ Give you a URL

---

### Step 4: Add Environment Variables

In Railway Dashboard → Your Service → Variables:

**Add these one by one:**

```
PORT = 5000
NODE_ENV = production
CLIENT_URL = https://security-guard-managemen-d593d.web.app
JWT_SECRET = 0cce2ae379f93dd8bb0a35124b7df36ef4256a9d0cc2b74c4d848e0b03efc75665d1ed04a53ec134cb6175fd552af175177b31f77cd25c8337809df1d8878a44
JWT_REFRESH_SECRET = 0dc504010783a3c8fb8b583c1de6635ae62f904c2b26c4600410c4cc9dad8664d01d8a137f91f8b29fbb09db05698cc72e4e0719bbf33f22cf94e8749fed2b29
DATABASE_URL = /app/data/secureguard.db
UPLOADS_DIR = /app/data/uploads
```

---

### Step 5: Add Persistent Volume

In Railway Dashboard → Your Service → Settings → Volumes:

1. **Click:** "+ New Volume"
2. **Mount Path:** `/app/data`
3. **Click:** "Add"

This ensures database never gets deleted!

---

### Step 6: Generate Domain

In Railway Dashboard → Your Service → Settings → Domains:

1. **Click:** "Generate Domain"
2. **Copy the URL** (like: `https://something.up.railway.app`)

---

### Step 7: Tell Me Your Railway URL

**Once you have the Railway URL, tell me!**

I'll update the Firebase frontend to connect to Railway.

---

## 🎯 Why Railway is Better

| Feature | Railway | Render Free |
|---------|---------|-------------|
| **Sleep** | ❌ Never sleeps | ✅ Sleeps after 15 min |
| **Startup** | Instant | 30+ seconds wake up |
| **Storage** | ✅ Persistent (free) | ❌ Lost on restart |
| **Cost** | $5 credit/month | $0 but limited |
| **Performance** | Better | Slower |

---

## 💰 Cost

- **$5 free credit/month**
- Small apps use ~$3-4/month
- **Net cost: ₹0** 🎉

---

## 📞 What to Do Now

1. ✅ Go to https://railway.app/
2. ✅ Login with GitHub
3. ✅ Deploy your repo
4. ✅ Add environment variables
5. ✅ Add volume for database
6. ✅ Generate domain
7. ✅ Tell me the URL

**I'll handle the rest!** 🚀

---

## 🆘 Need Help?

If you face any issue:
1. Take screenshot
2. Tell me the error
3. I'll fix it immediately

---

**Let's do this! Go to Railway and start deployment!** 🔥
