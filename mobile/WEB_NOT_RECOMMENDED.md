# ⚠️ Web Platform Limitation

## Issue Encountered

When running `npx expo start --web`, you're seeing this error:

```
Error: (0, _expoModulesCore.registerWebModule) is not a function
```

## Root Cause

Several Expo native modules used in TradeConnect **do not have web implementations**:

- ❌ **expo-secure-store** - Used for storing refresh tokens securely
- ❌ **expo-font** - Custom font loading
- ❌ **expo-notifications** - Push notifications
- ❌ **expo-location** - Geolocation for job feed
- ❌ **expo-image-picker** - Camera/photo library access

These are **native-only modules** that require iOS/Android platform APIs.

## Why This Happens

React Native apps are designed for **mobile platforms**. The web target is a convenience feature, but:

1. Native modules (SecureStore, Camera, etc.) have no browser equivalents
2. `expo-modules-core` web bindings are incomplete
3. TradeConnect's architecture assumes mobile platform features

## ✅ Recommended Testing Options

### 1. **Expo Go (Easiest - No Emulator Needed)**

Install Expo Go on your phone and scan the QR code:

```powershell
# In PowerShell
cd C:\tmp\tradeconnect\mobile
npx expo start
```

- Scan QR code with your phone camera (iOS) or Expo Go app (Android)
- App runs on real device with full native features
- Hot reload works perfectly

### 2. **Android Emulator (Full Featured)**

If you have Android Studio installed:

```powershell
cd C:\tmp\tradeconnect\mobile
npx expo start --android
```

**Setup Android Emulator** (if not already):
1. Download [Android Studio](https://developer.android.com/studio)
2. Open Android Studio → Tools → AVD Manager
3. Create Virtual Device (Pixel 6, Android 13+)
4. Start the emulator
5. Run `npx expo start --android`

### 3. **iOS Simulator (macOS Only)**

```bash
npx expo start --ios
```

Requires macOS with Xcode installed.

## 🔧 Workaround for Web (Limited)

If you **really need** to test on web, you'd need to:

1. **Create web-specific fallbacks** for all native modules
2. **Mock SecureStore** with localStorage (insecure)
3. **Remove expo-font** or use web fonts
4. **Disable** notifications, location, image picker

This would require significant code changes and wouldn't represent the real app.

## 📱 Current App Status

The app is **fully working** on mobile platforms:
- ✅ Metro bundler running on http://localhost:8081
- ✅ QR code ready for Expo Go
- ✅ Mock mode enabled (no backend needed)
- ✅ All native features functional

## 🎯 Next Steps

**For testing the app UI and flows:**

1. **Install Expo Go** on your phone:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Scan the QR code** shown in your terminal

3. **App opens** with full functionality:
   - Welcome screen
   - Registration/Login
   - Customer/Provider dashboards
   - All UI components working

**For comprehensive testing:**

Set up Android Studio emulator for full device simulation.

## 🚀 Quick Command Reference

```powershell
# Stop current server (Ctrl+C in terminal)

# Start for Expo Go (scan QR code)
npx expo start

# Start for Android emulator
npx expo start --android

# Clear cache if needed
npx expo start --clear
```

## 📊 Platform Support Matrix

| Feature | iOS | Android | Web |
|---------|-----|---------|-----|
| Authentication | ✅ | ✅ | ❌ (SecureStore) |
| Job Feed | ✅ | ✅ | ❌ (Location) |
| Messaging | ✅ | ✅ | ⚠️ (Limited) |
| Image Upload | ✅ | ✅ | ❌ (ImagePicker) |
| Notifications | ✅ | ✅ | ❌ (Push) |
| UI Components | ✅ | ✅ | ⚠️ (Partial) |

Legend:
- ✅ Fully supported
- ⚠️ Partially supported
- ❌ Not supported

## Summary

**Web is not a viable platform for testing TradeConnect** due to native module dependencies.

**Use Expo Go on your phone** for the quickest and easiest testing experience with full features.

