# 🤖 Android Emulator Setup Guide for Windows

## Overview

This guide will help you set up the Android emulator to run the TradeConnect mobile app on your Windows machine.

---

## ⚙️ Step 1: Install Android Studio

### Download Android Studio

1. **Go to**: [https://developer.android.com/studio](https://developer.android.com/studio)
2. **Click**: "Download Android Studio"
3. **File size**: ~1 GB download
4. **Accept** the terms and conditions
5. **Save** the installer (e.g., `android-studio-2024.x.x.x-windows.exe`)

### Install Android Studio

1. **Run** the downloaded installer
2. **Setup wizard** will appear - click "Next"
3. **Choose components**:
   - ✅ Android Studio
   - ✅ Android Virtual Device (AVD)
4. **Install location**: Default is fine (`C:\Program Files\Android\Android Studio`)
5. **Click** "Next" → "Install"
6. **Wait** for installation (5-10 minutes)
7. **Click** "Finish" when done

---

## 📦 Step 2: Complete Android Studio Setup

### First Launch

1. **Launch** Android Studio
2. **Import settings**: Choose "Do not import settings"
3. **Data sharing**: Choose your preference
4. **Welcome wizard** appears

### Install SDK Components

1. **Setup Type**: Choose "Standard" (recommended)
2. **UI Theme**: Choose Light or Dark
3. **SDK Components** screen shows what will be installed:
   - ✅ Android SDK
   - ✅ Android SDK Platform
   - ✅ Android Virtual Device
4. **Verify settings** and click "Next"
5. **Accept licenses**: Check all boxes and click "Finish"
6. **Wait** for download (3-5 GB, takes 10-30 minutes depending on internet)

### Verify Installation

1. **Click** "Finish" when complete
2. **Welcome screen** appears with "More Actions" button

---

## 📱 Step 3: Create Android Virtual Device (AVD)

### Open Device Manager

1. **From Welcome screen**: Click "More Actions" → "Virtual Device Manager"
   - OR if project is open: Tools → Device Manager
2. **Device Manager** panel opens

### Create New Device

1. **Click** "Create Device" button
2. **Choose hardware**:
   - **Category**: Phone
   - **Device**: **Pixel 6** (recommended) or Pixel 5
   - Shows: 6.4" display, 1080 x 2400 resolution
3. **Click** "Next"

### Select System Image

1. **Release Name**: **Tiramisu** (Android 13, API 33) - recommended
   - Or **UpsideDownCake** (Android 14, API 34)
2. **Click** "Download" next to your chosen version
3. **License Agreement**: Accept and click "Next"
4. **Wait** for download (~1-2 GB)
5. **Click** "Finish"
6. **Select** the downloaded system image
7. **Click** "Next"

### Configure AVD

1. **AVD Name**: "Pixel_6_API_33" (or keep default)
2. **Startup orientation**: Portrait
3. **Advanced Settings** (optional but recommended):
   - **RAM**: 2048 MB (or 4096 MB if you have 16GB+ system RAM)
   - **VM heap**: 512 MB
   - **Internal Storage**: 2048 MB
   - **SD Card**: 512 MB
4. **Click** "Finish"

### Verify Device Created

- Device appears in Device Manager list
- Shows: Pixel 6, Android 13 (or 14), API 33 (or 34)

---

## 🚀 Step 4: Launch the Emulator

### Start Emulator from Android Studio

1. **Device Manager**: Find your AVD
2. **Click** the ▶️ (Play) button next to your device
3. **Emulator window** opens (first launch takes 2-3 minutes)
4. **Wait** for Android to boot fully
5. **You'll see**: Android home screen with apps

### Verify Emulator is Running

1. **Emulator should show**: Android lock screen or home screen
2. **You can**: Swipe, tap, interact with Android UI
3. **Status**: Device is now ready

---

## 🛠️ Step 5: Set Up Environment Variables (Important!)

For Expo to detect your emulator, you need to add Android SDK to PATH.

### Find SDK Location

1. **Android Studio**: Click "More Actions" → "SDK Manager"
2. **Top of window** shows: "Android SDK Location"
3. **Default**: `C:\Users\YourUsername\AppData\Local\Android\Sdk`
4. **Copy** this path

### Add to PATH (Windows)

1. **Open**: Windows Search → type "Environment Variables"
2. **Click**: "Edit the system environment variables"
3. **System Properties** window → Click "Environment Variables"
4. **Under "User variables"** (top section):

   **a) Create ANDROID_HOME variable:**
   - Click "New"
   - Variable name: `ANDROID_HOME`
   - Variable value: `C:\Users\YourUsername\AppData\Local\Android\Sdk`
   - Click "OK"

   **b) Edit PATH variable:**
   - Find "Path" in User variables → Click "Edit"
   - Click "New" and add: `%ANDROID_HOME%\platform-tools`
   - Click "New" and add: `%ANDROID_HOME%\emulator`
   - Click "New" and add: `%ANDROID_HOME%\tools`
   - Click "OK" on all windows

5. **Restart PowerShell** (close all terminals and open new one)

### Verify Environment Variables

Open **new PowerShell terminal**:

```powershell
# Check ANDROID_HOME
echo $env:ANDROID_HOME
# Should show: C:\Users\YourUsername\AppData\Local\Android\Sdk

# Check adb is accessible
adb version
# Should show: Android Debug Bridge version x.x.x

# List connected devices
adb devices
# Should show your emulator (e.g., emulator-5554)
```

---

## 🎯 Step 6: Run TradeConnect on Emulator

### Option A: Automatic Launch

With emulator running:

```powershell
cd C:\tmp\tradeconnect\mobile
npx expo start --android
```

- Expo will detect the emulator
- App will install and launch automatically
- Wait 30-60 seconds for first build

### Option B: Manual Launch (if automatic fails)

1. **Start Expo** without platform flag:
   ```powershell
   cd C:\tmp\tradeconnect\mobile
   npx expo start
   ```

2. **In Expo menu**, press **`a`** to open on Android

3. **Or scan QR code**:
   - In emulator: Open Chrome
   - Navigate to QR code URL shown in terminal
   - Or use: `exp://localhost:8081`

### Verify App is Running

You should see:
1. ✅ Expo splash screen (blue)
2. ✅ TradeConnect welcome screen
3. ✅ "Get Started" button
4. ✅ Can navigate and interact

---

## 🐛 Troubleshooting

### Issue: "No devices found"

**Solutions**:
```powershell
# Check if emulator is running
adb devices

# Should show:
# List of devices attached
# emulator-5554   device

# If offline, restart adb:
adb kill-server
adb start-server
adb devices
```

### Issue: Emulator is slow

**Solutions**:
1. **Enable Hardware Acceleration**:
   - Android Studio → Tools → SDK Manager → SDK Tools
   - ✅ Intel x86 Emulator Accelerator (HAXM)
   - Or enable Hyper-V (Windows Pro)

2. **Increase RAM**:
   - Device Manager → Edit AVD (pencil icon)
   - Advanced Settings → RAM: 4096 MB

3. **Use Cold Boot**:
   - Device Manager → AVD dropdown → Cold Boot Now

### Issue: "SDK location not found"

**Solution**:
```powershell
# Set environment variable
$env:ANDROID_HOME = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"

# Add to PATH
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"

# Verify
adb version
```

### Issue: Expo won't connect

**Solutions**:
```powershell
# 1. Check Metro bundler is running
# Look for: "Metro waiting on exp://..."

# 2. Clear Expo cache
npx expo start --clear

# 3. Reinstall Expo Go on emulator
adb uninstall host.exp.exponent
npx expo start --android
```

### Issue: Build fails / Metro errors

**Solutions**:
```powershell
# Clear all caches
cd C:\tmp\tradeconnect\mobile

# Clear npm cache
npm cache clean --force

# Clear Expo cache
npx expo start --clear

# Clear watchman (if installed)
watchman watch-del-all

# Reinstall node_modules
rm -rf node_modules
npm install

# Try again
npx expo start --android
```

### Issue: Emulator stuck at boot

**Solutions**:
1. **Close emulator** (X button)
2. **Cold Boot**:
   - Device Manager → AVD dropdown → "Cold Boot Now"
3. **Or Wipe Data**:
   - Device Manager → AVD dropdown → "Wipe Data"
   - This resets emulator (you'll lose any apps/data)

---

## ⚡ Quick Reference Commands

```powershell
# Start Expo (from mobile directory)
npx expo start --android

# Check connected devices
adb devices

# Restart adb if issues
adb kill-server
adb start-server

# Check Android environment
echo $env:ANDROID_HOME

# List available emulators
emulator -list-avds

# Start specific emulator from command line
emulator -avd Pixel_6_API_33
```

---

## 📊 System Requirements

**Minimum**:
- Windows 10 (64-bit)
- 8 GB RAM
- 8 GB free disk space
- Intel/AMD processor with virtualization support

**Recommended**:
- Windows 10/11 (64-bit)
- 16 GB RAM
- 20 GB free disk space
- Intel i5/i7 or AMD Ryzen 5/7
- SSD (for faster emulator performance)

---

## 🎓 Alternative: Use Your Physical Phone

If the emulator is too slow or you have issues:

1. **Install Expo Go** on your phone
2. **Connect to same WiFi** as your PC
3. **Run**: `npx expo start`
4. **Scan QR code** with phone
5. **Faster and more responsive** than emulator!

---

## ✅ Checklist

Before running the app, ensure:

- [ ] Android Studio installed
- [ ] Android SDK downloaded (via SDK Manager)
- [ ] AVD (Pixel 6, Android 13+) created
- [ ] ANDROID_HOME environment variable set
- [ ] platform-tools in PATH (adb accessible)
- [ ] Emulator launched and showing Android home screen
- [ ] `adb devices` shows connected emulator
- [ ] Terminal in `C:\tmp\tradeconnect\mobile` directory

Once all checked, run:
```powershell
npx expo start --android
```

---

## 🎯 Expected Result

When everything is set up correctly:

1. **Emulator launches** (Android home screen visible)
2. **Run command**: `npx expo start --android`
3. **Expo builds** JavaScript bundle (30-60 seconds first time)
4. **App installs** on emulator
5. **TradeConnect opens** showing Welcome screen
6. **You can test** all features with touch/mouse interaction
7. **Hot reload works** (edit code → auto-updates in emulator)

---

## 📞 Need Help?

If you encounter issues:
1. Check the Troubleshooting section above
2. Verify environment variables are set correctly
3. Ensure emulator is fully booted before running `npx expo start --android`
4. Try cold boot or wipe data if emulator is problematic

---

**Setup Time**: 30-60 minutes (mostly waiting for downloads)
**After Setup**: Can launch emulator and app in under 2 minutes!

