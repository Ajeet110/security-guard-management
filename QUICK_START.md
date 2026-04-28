# 🚀 Quick Start Guide

## Local Development

### 1. Install Dependencies
```bash
npm install
cd client && npm install && cd ..
```

### 2. Create .env File
Create `.env` in root directory:
```env
PORT=5000
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

### 3. Start Application
```bash
# Development mode (both server and client)
npm run dev

# Or separately:
npm run server  # Backend only
npm run client  # Frontend only
```

### 4. Access Application
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

### 5. Default Login
- User ID: `2026`
- Password: `owner123`

---

## Production Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete instructions.

### Quick Deploy to Render

1. **Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_URL
git push -u origin main
```

2. **Deploy on Render:**
- Go to https://render.com
- Create new Web Service
- Connect GitHub repo
- Build Command: `npm install && cd client && npm install && npm run build && cd ..`
- Start Command: `npm start`
- Add environment variables:
  - `NODE_ENV=production`
  - `PORT=5000`
  - `JWT_SECRET=your-secret-key`

3. **Done!** Your app is live! 🎉

---

## Useful Commands

```bash
# Show all user credentials
npm run credentials

# Update passwords
npm run update-passwords

# Seed database with sample data
npm run seed

# Build frontend for production
npm run build
```

---

## Troubleshooting

### Port already in use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

### Database locked
```bash
# Delete database and restart
rm server/database/secureguard.db
npm run server
```

### Clear node_modules
```bash
# Root
rm -rf node_modules package-lock.json
npm install

# Client
cd client
rm -rf node_modules package-lock.json
npm install
```

---

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context
│   │   └── utils/         # Utilities
│   └── package.json
├── server/                # Node.js backend
│   ├── database/         # SQLite database
│   ├── middleware/       # Express middleware
│   ├── routes/           # API routes
│   ├── utils/            # Utilities
│   └── index.js          # Entry point
├── uploads/              # File uploads
├── .env                  # Environment variables
├── package.json          # Dependencies
└── README.md            # Documentation
```

---

## Need Help?

- 📖 Read [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- 🐛 Check GitHub Issues
- 💬 Contact support

---

**Happy Coding! 🎊**
