# 🚀 Running TradeConnect Mobile App

## ✅ Current Status

The TradeConnect mobile app is **READY TO RUN**!

- ✅ Dependencies installed (1330 packages)
- ✅ Metro bundler running on port 8081
- ✅ Mock mode ENABLED (no backend required)
- ✅ App configured and ready to launch

---

## 🏃‍♂️ Quick Start

The Expo development server is already running in the background. Here's how to view the app:

### Option 1: Expo Go App (Recommended for Testing)

1. **Install Expo Go** on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Connect to the dev server**:
   - Open a new terminal in `C:\tmp\tradeconnect\mobile`
   - Run: `npx expo start`
   - Scan the QR code with:
     - iOS: Camera app
     - Android: Expo Go app

3. **App will open** in Expo Go with hot reload enabled

### Option 2: iOS Simulator (macOS only)

```bash
cd C:\tmp\tradeconnect\mobile
npx expo start --ios
```

### Option 3: Android Emulator

```bash
cd C:\tmp\tradeconnect\mobile
npx expo start --android
```

Make sure Android Studio and an AVD (Android Virtual Device) are set up first.

### Option 4: Web Browser (Limited functionality)

```bash
cd C:\tmp\tradeconnect\mobile
npx expo start --web
```

Note: Some React Native features won't work on web (SecureStore, native gestures, etc.)

---

## 🔧 Current Configuration

**Environment Variables** (`.env`):
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
EXPO_PUBLIC_MOCK_MODE=true          # ✅ MOCK MODE ENABLED
EXPO_PUBLIC_ENABLE_SOCKET=false     # Disabled (no backend)
```

### Mock Mode Features

With `MOCK_MODE=true`, the app will:
- ✅ Work without backend server
- ✅ Return mock data for all API calls
- ✅ Simulate authentication (any email/password works)
- ✅ Show sample jobs, quotes, and messages
- ✅ Allow testing all UI flows

---

## 📱 What You'll See

### 1. Welcome Screen
First screen when you open the app:
- "Get Started" button
- Role selection: Customer or Provider

### 2. Registration Flow
- Choose role: "I need services" (Customer) or "I'm a tradie" (Provider)
- Fill form: Name, Email, Phone, Password
- Auto-login after registration

### 3. Customer Experience
After login as customer, you'll see tabs:
- **My Jobs**: View posted jobs, quotes received
- **Messages**: Real-time chat (Socket.IO - disabled in mock mode)
- **Profile**: View/edit profile, logout

### 4. Provider Experience
After login as provider, you'll see tabs:
- **Job Feed**: Browse available jobs with infinite scroll
- **Messages**: Chat with customers
- **Profile**: View/edit profile, logout

---

## 🧪 Mock Mode Test Credentials

In mock mode, **any credentials work**. For consistency with test plan:

| Email | Password | Role | Use Case |
|-------|----------|------|----------|
| customer1@test.com | Test1234! | customer | Customer with active jobs |
| provider1@test.com | Test1234! | provider | Provider browsing jobs |

---

## 🛠️ Development Commands

### Start Dev Server
```bash
npm start
```

### Start with Options
```bash
npm start -- --clear    # Clear Metro cache
npm start -- --ios      # Open iOS simulator
npm start -- --android  # Open Android emulator
npm start -- --web      # Open in browser
```

### Reset Everything
```bash
# Stop all Expo processes
taskkill /F /IM node.exe /FI "WINDOWTITLE eq npm*"

# Clear cache and restart
npx expo start --clear
```

---

## 🔍 Troubleshooting

### Metro Bundler Won't Start
```bash
# Kill process on port 8081
netstat -ano | findstr :8081
taskkill /F /PID <PID>

# Restart
npm start
```

### TypeScript Errors
```bash
# Rebuild TypeScript
npx tsc --noEmit

# Check for errors
npm run type-check  # (if configured)
```

### App Crashes on Launch
1. Check Metro bundler console for errors
2. Verify `.env` file exists
3. Try clearing cache: `npx expo start --clear`
4. Check React Native debugger for runtime errors

### Mock Mode Not Working
1. Verify `.env` has `EXPO_PUBLIC_MOCK_MODE=true`
2. Restart Metro bundler to reload env vars
3. Check API client in `src/api/client.ts` for mock logic

---

## 📊 Performance Monitoring

While the app is running, you can monitor performance:

### React Native Performance Monitor
- Shake device (physical) or press `Cmd+D` (iOS) / `Cmd+M` (Android)
- Select "Show Perf Monitor"
- View JS/UI thread FPS

### Chrome DevTools
- Open Metro bundler terminal
- Press `j` to open debugger
- Use Chrome DevTools for:
  - Network requests
  - Console logs
  - Component inspection (React DevTools)

### Flipper (Advanced)
```bash
# Install Flipper desktop app
# https://fbflipper.com/

# Flipper will auto-detect running Expo app
# Features:
# - Network inspector
# - Layout inspector
# - Database viewer
# - Logs
```

---

## 🔄 Switching Modes

### Enable Real Backend

1. **Start backend server**:
   ```bash
   cd C:\tmp\tradeconnect\backend
   npm run dev
   ```

2. **Update `.env`**:
   ```env
   EXPO_PUBLIC_MOCK_MODE=false
   EXPO_PUBLIC_ENABLE_SOCKET=true
   ```

3. **Restart app**:
   ```bash
   # In mobile directory
   npx expo start --clear
   ```

4. **Verify backend connection**:
   - Open app
   - Try to login/register
   - Check Metro console for API calls
   - Should see requests to `http://localhost:3000/api`

---

## 📱 Next Steps

1. ✅ **Test the app** using Expo Go
2. ✅ **Navigate through flows**: Registration → Login → Dashboard
3. ✅ **Test role switching**: Try both Customer and Provider experiences
4. ✅ **Check UI components**: Buttons, inputs, cards, status pills
5. ✅ **Review code**: Explore `src/` and `app/` directories
6. ✅ **Run QA test plan**: See `QA_TEST_PLAN.md` for 25 comprehensive tests

---

## 🎯 Current Running Services

| Service | Port | Status | URL |
|---------|------|--------|-----|
| Metro Bundler | 8081 | ✅ Running | http://localhost:8081 |
| Backend API | 3000 | ❌ Not needed (Mock mode) | - |
| Socket.IO | - | ❌ Disabled | - |

---

## 📞 Support

If you encounter issues:
1. Check Metro bundler console output
2. Review React Native error screen (red/yellow boxes)
3. Check this guide's troubleshooting section
4. Review `SETUP.md` and `README.md` for detailed info

---

**Status**: ✅ **READY TO RUN**
**Last Updated**: 2026-02-25
**Metro Bundler**: Running on port 8081
**Mode**: Mock Mode (no backend required)
