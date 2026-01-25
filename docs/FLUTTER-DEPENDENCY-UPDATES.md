# Flutter Dependency Updates

Generated: 2026-01-25

This document tracks outdated Flutter dependencies that can be updated incrementally.
Work through these one at a time to minimize risk of breaking changes.

---

## Summary

| Type | Count |
|------|-------|
| Direct dependencies | 5 |
| Dev dependencies | 1 |
| Transitive (auto-update) | 11 |

---

## Priority Guide

- 🟢 **Low Risk** - Minor version, unlikely to break
- 🟡 **Medium Risk** - Major version, review changelog
- 🔴 **High Risk** - Major version with known breaking changes

---

## Direct Dependencies

These require manual updates to `pubspec.yaml`.

### 1. 🟡 intl (0.19.0 → 0.20.2)
**What it does:** Internationalization and localization (date/number formatting)

**Current constraint:** Check pubspec.yaml

**Update to:**
```yaml
intl: ^0.20.0
```

**Risk:** Medium - May have formatting changes. Test date displays.

**Changelog:** https://pub.dev/packages/intl/changelog

---

### 2. 🟡 app_links (6.4.1 → 7.0.0)
**What it does:** Deep linking / app links handling

**Current constraint:** Check pubspec.yaml

**Update to:**
```yaml
app_links: ^7.0.0
```

**Risk:** Medium - Major version bump. Review deep link handling.

**Changelog:** https://pub.dev/packages/app_links/changelog

---

### 3. 🟡 flutter_secure_storage (9.2.4 → 10.0.0)
**What it does:** Secure storage for tokens/credentials (uses Keychain on iOS, Keystore on Android)

**Current constraint:** Check pubspec.yaml

**Update to:**
```yaml
flutter_secure_storage: ^10.0.0
```

**Risk:** Medium - Major version. This may fix the iOS deployment target warnings.

**Note:** This will also update transitive dependencies:
- flutter_secure_storage_linux (1.2.3 → 3.0.0)
- flutter_secure_storage_platform_interface (1.1.2 → 2.0.1)
- flutter_secure_storage_web (1.2.1 → 2.1.0)
- flutter_secure_storage_windows (3.1.2 → 4.1.0)

**Changelog:** https://pub.dev/packages/flutter_secure_storage/changelog

---

### 4. 🟡 share_plus (10.1.4 → 12.0.1)
**What it does:** Share content to other apps

**Current constraint:** Check pubspec.yaml

**Update to:**
```yaml
share_plus: ^12.0.0
```

**Risk:** Medium - Major version (skipping 11.x). May fix 'keyWindow' deprecation warning.

**Changelog:** https://pub.dev/packages/share_plus/changelog

---

### 5. 🟡 package_info_plus (8.3.1 → 9.0.0)
**What it does:** Get app version, build number, package name

**Current constraint:** Check pubspec.yaml

**Update to:**
```yaml
package_info_plus: ^9.0.0
```

**Risk:** Medium - Major version bump.

**Changelog:** https://pub.dev/packages/package_info_plus/changelog

---

## Dev Dependencies

### 6. 🟢 flutter_launcher_icons (0.13.1 → 0.14.4)
**What it does:** Generate app icons from a single image

**Update to:**
```yaml
flutter_launcher_icons: ^0.14.0
```

**Risk:** Low - Only used at build time, not runtime.

**Changelog:** https://pub.dev/packages/flutter_launcher_icons/changelog

---

## Transitive Dependencies (Auto-update)

These will update automatically when you update their parent packages. No manual action needed.

| Package | Current | Latest | Parent Package |
|---------|---------|--------|----------------|
| flutter_secure_storage_linux | 1.2.3 | 3.0.0 | flutter_secure_storage |
| flutter_secure_storage_macos | 3.1.3 | 4.0.0 | flutter_secure_storage |
| flutter_secure_storage_platform_interface | 1.1.2 | 2.0.1 | flutter_secure_storage |
| flutter_secure_storage_web | 1.2.1 | 2.1.0 | flutter_secure_storage |
| flutter_secure_storage_windows | 3.1.2 | 4.1.0 | flutter_secure_storage |
| share_plus_platform_interface | 5.0.2 | 6.1.0 | share_plus |
| characters | 1.4.0 | 1.4.1 | (flutter core) |
| material_color_utilities | 0.11.1 | 0.13.0 | (flutter core) |
| meta | 1.17.0 | 1.18.0 | (flutter core) |

---

## Discontinued Packages

### ⚠️ js (0.6.7)
**Status:** DISCONTINUED

This is a transitive dependency. Dart now has built-in JS interop.
The package will eventually be removed when dependencies update.

**Action:** No immediate action needed. Will resolve when dependencies update.

---

## Recommended Update Order

Update one at a time, test thoroughly before moving to next:

1. **flutter_launcher_icons** (dev only, lowest risk)
2. **intl** (commonly used, well-maintained)
3. **package_info_plus** (simple API, unlikely to break)
4. **flutter_secure_storage** (may fix Xcode warnings)
5. **share_plus** (may fix Xcode warnings)
6. **app_links** (test deep linking thoroughly)

---

## How to Update

For each package:

1. Update version in `pubspec.yaml`
2. Run `flutter pub get`
3. Run `flutter analyze`
4. Test the affected functionality
5. Build for iOS and Android
6. Commit if all good

**Or update all at once (riskier):**
```bash
flutter pub upgrade --major-versions
```

---

## Checklist

- [ ] flutter_launcher_icons (0.13.1 → 0.14.4)
- [ ] intl (0.19.0 → 0.20.2)
- [ ] package_info_plus (8.3.1 → 9.0.0)
- [ ] flutter_secure_storage (9.2.4 → 10.0.0)
- [ ] share_plus (10.1.4 → 12.0.1)
- [ ] app_links (6.4.1 → 7.0.0)
