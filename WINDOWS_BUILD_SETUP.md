# Building TripBae for Android on Windows

This guide walks a **Windows** user through installing everything needed to build the
TripBae Android app (`.apk`) from this repo and run it on a phone or emulator.

The project is a **Capacitor 8** app (Vite + React + Firebase) with a native Android
wrapper. On this repo's Mac the equivalent stack is `node` + Homebrew `openjdk@21` +
Android SDK at `~/Library/Android/sdk`; below is the same thing, but Windows-shaped.

---

## 1. What you need overall

| Tool | Purpose | Minimum version |
|------|---------|-----------------|
| **Node.js** | Runs `npm`, Vite, Capacitor CLI | 20+ (LTS recommended) |
| **Git** | Clone the repo | any recent |
| **JDK 21** | Compiles the Java/Kotlin Android code | **21** (17 also works, 21 is safest) |
| **Android Studio** | Bundles the Android SDK + tools, opens the project | Latest (2024.2+) |
| **Android SDK** | Compiles against Android 36, platform/build-tools | Platform **36**, Build-Tools 35/36 |
| **Gradle** | Build tool — **no separate install**, the repo includes the wrapper | Wrapper already set to 8.14.3 |

> **You do NOT install Gradle or the Android command-line tools yourself** for a basic
> build. Gradle comes from the checked-in wrapper (`android/gradlew.bat`), and Android
> Studio installs the SDK for you. Android Studio is also the easiest place to install
> emulators/java without touching the command line, but the sections below give both paths.

---

## 2. Install Node.js

- Download the **LTS** installer from **https://nodejs.org/**
  (recommended version — includes `npm`).
- Run the `.msi`, keep all defaults.
- Verify in a new **Command Prompt** / **PowerShell**:

```bat
node -v
npm -v
```

You should see `v20.x` (or newer) and `10.x` for each.

---

## 3. Install Git

- Download from **https://git-scm.com/download/win**
- Install, accept defaults (make sure "Git from the command line" is selected).
- Verify:

```bat
git --version
```

---

## 4. Install JDK 21

Two options — pick one.

### Option A — via Android Studio (simplest, recommended)
Android Studio bundles its own JDK ("JBR 21") and uses it for Gradle builds
automatically. **If you install/use Android Studio, you can skip the standalone JDK
install entirely.** Jump to section 5.

### Option B — standalone JDK 21 (for command-line `gradlew` builds)
1. Download **Eclipse Temurin JDK 21 (LTS)**  
   → **https://adoptium.net/** → "Temurin 21 (LTS)" → **Windows x64** → `.msi`
   (or .zip for portable).
2. Run the `.msi` and install.
3. Set the `JAVA_HOME` environment variable (also add `%JAVA_HOME%\bin` to `PATH`):
   - Press <kbd>Win</kbd>, type **"edit environment variables"** → open it.
   - Under *System variables* → **New**:
     - Name: `JAVA_HOME`
     - Value: `C:\Program Files\Eclipse Adoptium\jdk-21.0.x.x` (the actual install folder)
   - Edit `Path` → **New** → add `%JAVA_HOME%\bin`
   - Click OK, open a **new** terminal, verify:

```bat
java -version
```
You should see `openjdk version "21.0.x"`.

---
## 5. Install Android Studio + SDK

1. Download the latest **Android Studio** from **https://developer.android.com/studio**.
2. Run the installer, accept defaults (it installs to `C:\Program Files\Android\Android Studio`).
3. On first launch, it offers to download the **Android SDK** — accept the defaults.
   This installs the SDK to `C:\Users\<you>\AppData\Local\Android\Sdk`.

### Install the exact SDK versions this project needs
- Open Android Studio → **Settings** (<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>S</kbd>)
  → **Languages & Frameworks → Android SDK** (or **SDK Manager**).
- On the **SDK Platforms** tab, tick **Android 36 (API 36)**.
- On the **SDK Tools** tab, make sure these are ticked:
  - **Android SDK Build-Tools 36** (and 35)
  - **Android SDK Platform-Tools** (gives `adb`)
  - *(optional)* **Android Emulator** + a system image if you want to run an emulator.
- Apply/OK and let it download.

That's everything required — Android Studio sets up the SDK automatically.

---

## 6. Clone the repo & prepare

```bat
git clone https://github.com/Akshit706/tripbae-mobile.git
cd tripbae-mobile
npm install
```

Later, when you change code and need to rebuild the native app:

```bat
npm run build        :: builds dist/ web assets
npx cap sync android :: copies dist/ into the android project
```

---

## 7. Tell Gradle where the SDK is (command-line builds only)

If you build from the command line (not Android Studio), Gradle needs to find the SDK.
Create a file `android/local.properties`:

```
sdk.dir=C\:\\Users\\<you>\\AppData\\Local\\Android\\Sdk
```

(replace `<you>` with your Windows username; the double backslashes are required
because the file is read as a Java properties file). Android Studio creates/generates
this file automatically when you open the project, so if you use Android Studio you can
skip this.

---

## 8. Build the APK

### Course A — Android Studio (easiest)
1. Open the repo folder **containing the `android/` directory** in Android Studio
   (File → Open → select the `android` folder).
2. Let it sync (it may ask to install the SDK/accept licenses — accept).
3. **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
4. The APK lands in:
   ```
   android\app\build\outputs\apk\debug\app-debug.apk
   ```

### Course B — Command line
```bat
cd android
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.x.x   :: only if not using Android Studio's JBR
gradlew.bat :app:assembleDebug
```
The APK is written to `android\app\build\outputs\apk\debug\app-debug.apk`.

> First run downloads Gradle 8.14.3 + dependencies, so it takes a few minutes and
> needs internet. Later builds are fast.

---

## 9. Run it on a phone or emulator

- **Phone:** enable *Developer options* + *USB debugging* on the device, plug it in, then:
  ```bat
  adb install app\build\outputs\apk\debug\app-debug.apk
  ```
  (`adb` is in `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`)
- **Emulator:** create one in Android Studio (Device Manager), launch it, then
  drag-drop the APK or run it via the Android Studio Run button.

---

## 10. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Unable to locate a Java Runtime` when running `gradlew.bat` | No JDK found — install JDK 21 (section 4) or open the `android` folder in Android Studio and build from there. |
| `SDK location not found` | `android/local.properties` is missing/wrong — fix `sdk.dir` (section 7) or let Android Studio generate it. |
| `compileSdkVersion 36` requires API 36 | Install **Android 36 (API 36)** in the SDK Manager (section 5). |
| Gradle downloads are slow / WARN about no internet | First build downloads Gradle + deps — allow a few minutes; check firewall. |
| `npm` / `node` not recognized | Reinstall Node and reopen your terminal. |
| Firebase/Google sign-in on a test build fails | The Firebase project only whitelists registered SHA-1/package names; for local testing you may hit Google sign-in restrictions. Email/password + verification still work. |

---

## Where to get everything (quick links)

- **Node.js (LTS):** https://nodejs.org/
- **Git:** https://git-scm.com/download/win
- **JDK 21 (Temurin):** https://adoptium.net/ (only if not using Android Studio)
- **Android Studio:** https://developer.android.com/studio
- **Android command-line tools (alternative to full Studio):** https://developer.android.com/studio#command-line-tools-only

For reference, this repo's pinned build config:
`compileSdkVersion=36 · targetSdkVersion=36 · minSdkVersion=24 · Gradle 8.14.3 · Capacitor 8`