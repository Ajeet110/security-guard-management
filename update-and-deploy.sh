#!/bin/bash

# 🚀 Hybrid Deployment Script
# Frontend: Firebase | Backend: Render

echo "🔥 SecureGuard Connect - Hybrid Deployment"
echo "=========================================="
echo ""

# Check if Render URL is provided
if [ -z "$1" ]; then
    echo "❌ Error: Render backend URL required!"
    echo ""
    echo "Usage: ./update-and-deploy.sh <render-backend-url>"
    echo "Example: ./update-and-deploy.sh https://secureguard-api.onrender.com"
    echo ""
    exit 1
fi

RENDER_URL=$1

echo "📝 Configuration:"
echo "   Backend URL: $RENDER_URL"
echo "   Frontend: Firebase Hosting"
echo ""

# Update .env.production
echo "⚙️  Updating client environment variables..."
cat > client/.env.production << EOF
# Production environment variables for React
NODE_ENV=production

# Render Backend URL
REACT_APP_API_URL=$RENDER_URL
REACT_APP_SOCKET_URL=$RENDER_URL

# Disable source maps in production
GENERATE_SOURCEMAP=false
EOF

echo "✅ Environment variables updated!"
echo ""

# Build client
echo "🔨 Building React client..."
cd client
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Client build successful!"
echo ""

# Deploy to Firebase
echo "🚀 Deploying to Firebase..."
cd ..
firebase deploy --only hosting

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo ""
echo "🎉 Deployment Complete!"
echo "=========================================="
echo ""
echo "✅ Frontend: https://security-guard-managemen-d593d.web.app"
echo "✅ Backend: $RENDER_URL"
echo ""
echo "⚠️  Don't forget to update Render environment variable:"
echo "   CLIENT_URL=https://security-guard-managemen-d593d.web.app"
echo ""
echo "🧪 Test your app:"
echo "   1. Open: https://security-guard-managemen-d593d.web.app"
echo "   2. Check browser console for errors"
echo "   3. Test login functionality"
echo ""
