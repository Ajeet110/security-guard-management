@echo off
REM 🚀 Hybrid Deployment Script for Windows
REM Frontend: Firebase | Backend: Render

echo 🔥 SecureGuard Connect - Hybrid Deployment
echo ==========================================
echo.

REM Check if Render URL is provided
if "%~1"=="" (
    echo ❌ Error: Render backend URL required!
    echo.
    echo Usage: update-and-deploy.bat ^<render-backend-url^>
    echo Example: update-and-deploy.bat https://secureguard-api.onrender.com
    echo.
    exit /b 1
)

set RENDER_URL=%~1

echo 📝 Configuration:
echo    Backend URL: %RENDER_URL%
echo    Frontend: Firebase Hosting
echo.

REM Update .env.production
echo ⚙️  Updating client environment variables...
(
echo # Production environment variables for React
echo NODE_ENV=production
echo.
echo # Render Backend URL
echo REACT_APP_API_URL=%RENDER_URL%
echo REACT_APP_SOCKET_URL=%RENDER_URL%
echo.
echo # Disable source maps in production
echo GENERATE_SOURCEMAP=false
) > client\.env.production

echo ✅ Environment variables updated!
echo.

REM Build client
echo 🔨 Building React client...
cd client
call npm run build

if errorlevel 1 (
    echo ❌ Build failed!
    exit /b 1
)

echo ✅ Client build successful!
echo.

REM Deploy to Firebase
echo 🚀 Deploying to Firebase...
cd ..
call firebase deploy --only hosting

if errorlevel 1 (
    echo ❌ Deployment failed!
    exit /b 1
)

echo.
echo 🎉 Deployment Complete!
echo ==========================================
echo.
echo ✅ Frontend: https://security-guard-managemen-d593d.web.app
echo ✅ Backend: %RENDER_URL%
echo.
echo ⚠️  Don't forget to update Render environment variable:
echo    CLIENT_URL=https://security-guard-managemen-d593d.web.app
echo.
echo 🧪 Test your app:
echo    1. Open: https://security-guard-managemen-d593d.web.app
echo    2. Check browser console for errors
echo    3. Test login functionality
echo.
