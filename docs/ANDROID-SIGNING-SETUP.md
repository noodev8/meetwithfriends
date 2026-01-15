# Android App Signing Setup

This guide covers generating a release keystore for signing the Meet With Friends Android app for Google Play Store submission.

## Prerequisites

- Java Development Kit (JDK) installed
- `keytool` command available (comes with JDK)

## Generate the Keystore

Run this command from any directory (the keystore file is portable):

```bash
keytool -genkey -v -keystore mwf-release.keystore -alias mwf -keyalg RSA -keysize 2048 -validity 10000
```

You'll be prompted for:

| Prompt | Description |
|--------|-------------|
| Keystore password | Master password for the keystore file |
| Key password | Password for this specific key (can match keystore password) |
| First and last name | Your name or organisation name |
| Organizational unit | Team or department (optional) |
| Organization | Company name |
| City/Locality | Your city |
| State/Province | Your state or province |
| Country code | Two-letter code (e.g., GB, US) |

## Store Credentials Securely

Save these somewhere safe (password manager recommended):

- Keystore file: `mwf-release.keystore`
- Keystore password
- Key alias: `mwf`
- Key password

**WARNING:** If you lose the keystore or passwords, you cannot update your app on Google Play. Back up the keystore file in multiple secure locations.

## Configure Flutter to Use the Keystore

### 1. Create key.properties

Create `mwf-flutter/android/key.properties` (do NOT commit this file):

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=mwf
storeFile=../keystore/mwf-release.keystore
```

### 2. Place the Keystore

Create the keystore directory and copy your keystore:

```
mwf-flutter/android/keystore/mwf-release.keystore
```

### 3. Update build.gradle.kts

Edit `mwf-flutter/android/app/build.gradle.kts`:

```kotlin
plugins {
    id("com.android.application")
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
}

// Add this block to load key.properties
val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = java.util.Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(java.io.FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.noodev8.meetwithfriends"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    // Add signing config
    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties["keyAlias"] as String?
            keyPassword = keystoreProperties["keyPassword"] as String?
            storeFile = keystoreProperties["storeFile"]?.let { file(it) }
            storePassword = keystoreProperties["storePassword"] as String?
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.noodev8.meetwithfriends"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // Use release signing config
            signingConfig = signingConfigs.getByName("release")
        }
    }
}

flutter {
    source = "../.."
}
```

## Verify .gitignore

Ensure these are in `mwf-flutter/android/.gitignore`:

```
key.properties
keystore/
*.keystore
*.jks
```

## Build Release APK

```bash
cd mwf-flutter
flutter build apk --release
```

The signed APK will be at:
```
mwf-flutter/build/app/outputs/flutter-apk/app-release.apk
```

## Build Release App Bundle (for Play Store)

```bash
cd mwf-flutter
flutter build appbundle --release
```

The signed AAB will be at:
```
mwf-flutter/build/app/outputs/bundle/release/app-release.aab
```

## Google Play App Signing (Recommended)

Google Play offers managed app signing where Google holds the actual signing key and you use an "upload key" to authenticate releases. Benefits:

- If you lose your upload key, you can reset it
- Google can optimise your app for different devices
- More secure (signing key never leaves Google's servers)

To enable: Google Play Console > Your App > Setup > App signing

## Troubleshooting

### "keystore was tampered with, or password was incorrect"
- Check your keystore password is correct
- Ensure the keystore file isn't corrupted

### "Failed to read key from store"
- Verify the key alias matches (`mwf`)
- Check the key password is correct

### Build succeeds but app won't install
- Uninstall any existing debug version first
- Debug and release builds have different signatures
