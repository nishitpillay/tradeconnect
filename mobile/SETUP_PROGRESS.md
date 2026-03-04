# 🚀 Android Studio Setup - Interactive Progress Tracker

**Status**: In Progress
**Started**: 2026-02-25
**Current Step**: Step 1 - Download Android Studio

---

## 📥 STEP 1: Download Android Studio

### Action Required:

1. **Open your web browser**
2. **Navigate to**: https://developer.android.com/studio
3. **Click** the green "Download Android Studio" button
4. **File**: android-studio-2024.x.x.x-windows.exe (~1.1 GB)
5. **Save** to your Downloads folder

### Expected Result:
- [ ] File downloaded: `android-studio-*-windows.exe` in Downloads folder
- [ ] File size: ~1.1 GB

### ⏱️ Estimated Time: 5-15 minutes (depending on internet speed)

---

## 🔧 STEP 2: Install Android Studio

### Action Required:

1. **Locate** the downloaded file in your Downloads folder
2. **Right-click** → "Run as administrator"
3. **User Account Control** prompt → Click "Yes"
4. **Welcome screen** appears → Click "Next"
5. **Choose Components**:
   - ✅ Android Studio
   - ✅ Android Virtual Device
   - Click "Next"
6. **Configuration Settings**:
   - Install Location: `C:\Program Files\Android\Android Studio` (default is fine)
   - Click "Next"
7. **Choose Start Menu Folder**: Keep default → Click "Install"
8. **Wait** for installation progress (5-10 minutes)
9. **Installation Complete** → Click "Next" → Click "Finish"

### Expected Result:
- [ ] Android Studio installed
- [ ] Installation completed successfully
- [ ] Android Studio icon appears (may launch automatically)

### ⏱️ Estimated Time: 10-15 minutes

---

## 🎨 STEP 3: Complete First-Time Setup Wizard

### Action Required:

1. **Android Studio launches** (first time)
2. **Import Settings** dialog:
   - Select: "Do not import settings"
   - Click "OK"
3. **Data Sharing** dialog:
   - Choose your preference (either option is fine)
   - Click "Don't send" or "Send usage statistics"
4. **Welcome Screen** appears:
   - Click "Next"
5. **Install Type**:
   - Select: **"Standard"** (recommended)
   - Click "Next"
6. **Select UI Theme**:
   - Choose: Light or Darcula (dark theme)
   - Click "Next"
7. **Verify Settings** screen shows components to download:
   - ✅ Android SDK
   - ✅ Android SDK Platform
   - ✅ Performance (Intel HAXM)
   - ✅ Android Virtual Device
   - Total download: ~3-5 GB
   - Click "Next"
8. **License Agreement**:
   - Read licenses
   - Check: "I have read and agree..."
   - Click "Finish"

### Expected Result:
- [ ] Setup wizard completed
- [ ] Component download started
- [ ] Progress bars showing download status

### ⏱️ Estimated Time: 5 minutes (plus download time)

---

## 📦 STEP 4: Download SDK Components

### Action Required:

1. **Wait** for component downloads (this is the longest step)
2. **Monitor progress**:
   - Android SDK Platform-Tools
   - Android SDK Build-Tools
   - Android Emulator
   - Intel HAXM (Hardware Accelerated Execution Manager)
   - System Images
3. **Do NOT close** Android Studio during this process
4. When complete, click "Finish"

### Expected Result:
- [ ] All components downloaded (3-5 GB)
- [ ] "Download complete" message appears
- [ ] Android Studio Welcome screen shows

### ⏱️ Estimated Time: 20-40 minutes (depending on internet speed)

### While Waiting:
- ☕ Grab coffee
- 📖 Review the QA_TEST_PLAN.md
- 💭 Think about what features you want to test first

---

## 📱 STEP 5: Create Android Virtual Device (AVD)

### Action Required:

1. **From Welcome Screen**:
   - Click "More Actions" (three dots)
   - Select "Virtual Device Manager"
2. **Device Manager** panel opens
3. **Click** "Create Device" button
4. **Select Hardware**:
   - Category: Phone
   - **Select**: Pixel 6
   - Screen: 6.4", 1080 x 2400, 411 ppi
   - Click "Next"
5. **System Image** screen:
   - **Click on "Recommended" tab**
   - **Find**: Tiramisu (API Level 33, Android 13.0)
   - **Click** "Download" link next to Tiramisu
6. **Component Installer**:
   - Accept license agreement
   - Click "Next"
   - Wait for download (~1-2 GB)
   - Click "Finish" when done
7. **Back to System Image screen**:
   - **Select**: Tiramisu (now downloaded)
   - Click "Next"
8. **Android Virtual Device (AVD)**:
   - AVD Name: "Pixel_6_API_33" (or keep default)
   - Startup orientation: Portrait
   - **Click "Show Advanced Settings"**:
     - RAM: 2048 MB (or 4096 if you have 16GB+ RAM)
     - VM heap: 512 MB
     - Internal Storage: 2048 MB
     - SD card: 512 MB
   - Click "Finish"

### Expected Result:
- [ ] System image downloaded
- [ ] AVD created and appears in Device Manager list
- [ ] Shows: Pixel 6, API 33, Android 13.0

### ⏱️ Estimated Time: 10-15 minutes (including download)

---

## ▶️ STEP 6: Test Launch Emulator

### Action Required:

1. **In Device Manager**:
   - Find your "Pixel_6_API_33" device
   - Click the ▶️ (Play/Launch) button
2. **Emulator window opens**:
   - Wait for Android to boot (2-3 minutes first time)
   - You'll see: Google logo → Android booting animation
3. **Android home screen appears**:
   - Swipe up to unlock (if locked)
   - You should see app drawer with Google apps

### Expected Result:
- [ ] Emulator launched successfully
- [ ] Android home screen visible
- [ ] Can interact with emulator (tap, swipe)

### ⏱️ Estimated Time: 3-5 minutes (first boot)

### Troubleshooting:
- If emulator is very slow: Enable hardware acceleration (Intel HAXM or Hyper-V)
- If emulator won't boot: Try "Cold Boot Now" from Device Manager

---

## 🔧 STEP 7: Set Up Environment Variables

### Action Required:

**First, find your SDK location:**

1. **In Android Studio**:
   - Click "More Actions" → "SDK Manager"
   - Top of window shows: "Android SDK Location"
   - Example: `C:\Users\YourUsername\AppData\Local\Android\Sdk`
   - **Copy this path** (you'll need it)

**Set environment variables:**

2. **Open Windows Settings**:
   - Press `Win + R`
   - Type: `sysdm.cpl` and press Enter
   - Or: Search "Environment Variables" in Start menu
3. **System Properties** window opens:
   - Click "Environment Variables" button
4. **In "User variables" section** (top):

   **a) Create ANDROID_HOME:**
   - Click "New"
   - Variable name: `ANDROID_HOME`
   - Variable value: Paste your SDK path (e.g., `C:\Users\YourUsername\AppData\Local\Android\Sdk`)
   - Click "OK"

   **b) Edit PATH:**
   - Select "Path" → Click "Edit"
   - Click "New" and add: `%ANDROID_HOME%\platform-tools`
   - Click "New" and add: `%ANDROID_HOME%\emulator`
   - Click "New" and add: `%ANDROID_HOME%\tools\bin`
   - Click "OK"
5. **Click "OK"** on all dialogs to save

### Expected Result:
- [ ] ANDROID_HOME variable created
- [ ] PATH updated with Android tools
- [ ] All dialogs closed

### ⏱️ Estimated Time: 3-5 minutes

---

## ✅ STEP 8: Verify Environment Setup

### Action Required:

1. **Close ALL PowerShell/Terminal windows** (important!)
2. **Open NEW PowerShell window**
3. **Run these commands** to verify:

```powershell
# Check ANDROID_HOME
echo $env:ANDROID_HOME
# Should output: C:\Users\YourUsername\AppData\Local\Android\Sdk

# Check adb is accessible
adb version
# Should output: Android Debug Bridge version X.X.X

# List running emulators
adb devices
# Should show: emulator-5554   device (if emulator is running)
```

### Expected Result:
- [ ] ANDROID_HOME shows correct path
- [ ] adb version displays without error
- [ ] adb devices shows connected emulator

### ⏱️ Estimated Time: 2 minutes

### If Commands Fail:
- Double-check environment variables are set correctly
- Make sure you opened a NEW terminal (old ones won't have new PATH)
- Restart computer if variables still not recognized

---

## 🚀 STEP 9: Launch TradeConnect on Emulator

### Action Required:

1. **Make sure emulator is running** (from Step 6)
   - If closed, launch it again from Device Manager
2. **Open PowerShell** in TradeConnect mobile directory:
   ```powershell
   cd C:\tmp\tradeconnect\mobile
   ```
3. **Verify environment**:
   ```powershell
   # Check devices
   adb devices
   # Should show emulator-5554
   ```
4. **Launch the app**:
   ```powershell
   npx expo start --android
   ```
5. **Wait for build**:
   - Metro bundler starts
   - JavaScript bundle compiles (30-60 seconds)
   - Expo Go installs on emulator
   - App builds and installs
   - TradeConnect launches automatically

### Expected Result:
- [ ] Metro bundler running
- [ ] Expo Go installed on emulator
- [ ] TradeConnect app opens
- [ ] Welcome screen visible in emulator
- [ ] Can interact with app

### ⏱️ Estimated Time: 2-3 minutes (first build)

---

## 🎉 SUCCESS! You should now see:

### In the Emulator:
- ✅ TradeConnect Welcome screen
- ✅ "Get Started" button
- ✅ Clean UI with blue branding

### In PowerShell:
- ✅ Metro bundler logs
- ✅ "Bundling complete"
- ✅ No red errors

### What You Can Do:
- ✅ Tap buttons (use mouse)
- ✅ Fill forms (emulator keyboard appears)
- ✅ Navigate between screens
- ✅ Test registration/login (mock mode - any credentials work)
- ✅ Browse customer/provider dashboards

---

## 📊 Progress Checklist

Track your overall progress:

- [ ] Step 1: Android Studio downloaded
- [ ] Step 2: Android Studio installed
- [ ] Step 3: First-time setup completed
- [ ] Step 4: SDK components downloaded
- [ ] Step 5: AVD created (Pixel 6)
- [ ] Step 6: Emulator launched successfully
- [ ] Step 7: Environment variables set
- [ ] Step 8: adb/emulator commands verified
- [ ] Step 9: TradeConnect running on emulator

---

## 🔄 Quick Commands Reference (After Setup)

```powershell
# Start emulator from command line (alternative to Android Studio)
emulator -avd Pixel_6_API_33

# Check connected devices
adb devices

# Start Expo on Android
cd C:\tmp\tradeconnect\mobile
npx expo start --android

# Restart adb if issues
adb kill-server
adb start-server

# Clear Expo cache
npx expo start --clear
```

---

## 🆘 Common Issues

### Issue: Emulator very slow
**Fix**: Enable hardware acceleration (Intel HAXM or Hyper-V in Windows Features)

### Issue: "No devices found"
**Fix**:
```powershell
adb kill-server
adb start-server
adb devices
```

### Issue: Environment variables not working
**Fix**:
1. Close ALL terminals
2. Open NEW PowerShell
3. Test: `echo $env:ANDROID_HOME`

### Issue: Expo build fails
**Fix**:
```powershell
npx expo start --clear
```

---

## 📞 Next Steps After Setup

Once the app is running:

1. ✅ **Test the app** - Navigate through screens
2. ✅ **Try registration** - Any email/password works in mock mode
3. ✅ **Switch roles** - Try both Customer and Provider experiences
4. ✅ **Review code** - Explore app structure
5. ✅ **Run QA tests** - Follow QA_TEST_PLAN.md for comprehensive testing

---

**Total Setup Time**: 45-90 minutes
**Future Launches**: < 2 minutes!

**Status**: Ready to begin! Start with Step 1 above.

