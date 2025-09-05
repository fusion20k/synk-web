# 🚀 Complete Deployment Guide - Synk Backend & Frontend

## ✅ **FRONTEND FIXES APPLIED**

### **Electron Window Configuration Fixed**
- ✅ **Frameless window**: `frame: false` - No Windows default border
- ✅ **No devtools sidebar**: `devTools: false` - Clean production experience  
- ✅ **Hidden menu bar**: `autoHideMenuBar: true`
- ✅ **Taskbar icon**: `icon: path.join(__dirname, 'assets', 'icon.ico')`

### **Custom Titlebar Restored**
The app now uses the custom titlebar from `src/index.html` instead of Windows default.

## 🔧 **BACKEND DEPLOYMENT STEPS**

### **1. Deploy to Render**

#### **Create New Web Service:**
1. Go to [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Use these settings:
   - **Name**: `synk-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node render-backend-server.js`

#### **Add Environment Variables in Render:**
```bash
GOOGLE_CLIENT_ID=544344031124-34jtjr3q7dko703jvgfru7dpo5krcran.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://synk-backend.onrender.com/oauth2callback
NOTION_CLIENT_ID=262d872b-594c-805a-b303-0037e81991ad
NOTION_CLIENT_SECRET=secret_Jc6YH2auThHFyBNFyS4rXIM2ZZ5P591ZPkUIXd9F7LR
NOTION_REDIRECT_URI=https://synk-backend.onrender.com/oauth2callback/notion
PORT=10000
```

#### **Files to Upload to GitHub:**
- `render-backend-server.js` (complete OAuth server)
- `backend-package.json` (rename to `package.json`)
- `backend.env` (for reference, don't commit secrets)

### **2. Update Google Cloud Console**

#### **OAuth Client Configuration:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to "APIs & Services" → "Credentials"
3. Find your OAuth 2.0 Client ID
4. Under "Authorized redirect URIs", add:
   ```
   https://synk-backend.onrender.com/oauth2callback
   ```
5. **Remove** any old URLs like `synk-official.com`
6. Save changes

### **3. Test the Complete Flow**

#### **Backend Health Check:**
Visit: `https://synk-backend.onrender.com/`
Should show:
```json
{
  "status": "Synk Backend Running",
  "timestamp": "2024-01-XX...",
  "endpoints": [...]
}
```

#### **OAuth Flow Test:**
1. Start Electron app: `npm start`
2. Verify UI:
   - ✅ No Windows border (frameless)
   - ✅ No devtools sidebar
   - ✅ Custom titlebar visible
   - ✅ Taskbar icon present
3. Click "Connect Google"
4. Complete OAuth in browser
5. Should redirect to: `https://synk-backend.onrender.com/oauth-success`
6. App should receive tokens and show calendars

## 🔍 **TROUBLESHOOTING**

### **"Cannot GET /oauth2callback" Error**
- ✅ **FIXED**: `render-backend-server.js` now handles this route
- Returns proper success page instead of 404

### **404 Polling Errors**
- ✅ **EXPECTED**: Normal until OAuth completes
- ✅ **FIXED**: Server stores tokens and responds to polling

### **UI Issues**
- ✅ **FIXED**: Frameless window restored
- ✅ **FIXED**: DevTools disabled
- ✅ **FIXED**: Custom titlebar working

### **Taskbar Icon Missing**
- ✅ **FIXED**: Icon path configured in `main-clean.js`
- ✅ **VERIFIED**: `assets/icon.ico` exists

## 📋 **BACKEND SERVER FEATURES**

### **Implemented Routes:**
- `GET /` - Health check and API documentation
- `GET /oauth2callback` - Google OAuth callback handler
- `GET /oauth2callback/notion` - Notion OAuth callback (placeholder)
- `GET /api/oauth/result` - Polling endpoint for Electron app
- `GET /oauth-success` - Success page with auto-close
- `GET /oauth-error` - Error page with retry option

### **OAuth Flow:**
1. **Electron** → Opens Google OAuth URL
2. **Google** → Redirects to `/oauth2callback` with code
3. **Backend** → Exchanges code for tokens
4. **Backend** → Fetches user's calendars
5. **Backend** → Stores result keyed by state
6. **Backend** → Shows success page
7. **Electron** → Polls `/api/oauth/result` until tokens ready
8. **Backend** → Returns tokens and calendars to Electron
9. **Electron** → Stores tokens securely and displays calendars

### **Security Features:**
- ✅ CORS enabled for cross-origin requests
- ✅ Automatic cleanup of expired OAuth results
- ✅ Error handling with user-friendly pages
- ✅ State parameter validation

## 🎯 **EXPECTED RESULTS**

### **After Deployment:**
- ✅ **Electron App**: Frameless window, no devtools, custom titlebar
- ✅ **OAuth Flow**: Complete end-to-end without 404 errors
- ✅ **Backend**: Handles all OAuth callbacks properly
- ✅ **Polling**: Returns tokens when ready, 404 when pending
- ✅ **User Experience**: Smooth OAuth with success/error pages

### **Success Indicators:**
- Backend health check returns JSON status
- OAuth redirects to Render domain (not 404)
- Electron app receives tokens and calendars
- No more "Cannot GET /oauth2callback" errors
- Taskbar icon always visible
- Clean, professional UI without Windows borders

The complete system is now ready for production deployment! 🎉