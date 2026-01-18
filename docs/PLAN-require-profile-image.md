# Feature Plan: Require Profile Image for Group Membership

## Overview

Allow group organisers to optionally require that users have a profile image (avatar) before joining their group. Users without a profile image will be blocked from joining (either auto-join or request) and directed to update their profile.

---

## 1. Database Changes

### Add Column to `group_list` Table

```sql
ALTER TABLE group_list
ADD COLUMN require_profile_image BOOLEAN DEFAULT FALSE NOT NULL;
```

**Field Details:**
- **Column Name:** `require_profile_image`
- **Type:** `BOOLEAN`
- **Default:** `FALSE` (existing groups continue to work as-is)
- **Nullable:** `NOT NULL`

**Migration File:** Create `migrations/add_require_profile_image.sql`

---

## 2. Backend Changes (mwf-server)

### 2.1 Create Group Endpoint
**File:** `routes/groups/create_group.js`

**Changes:**
- Accept new optional field `require_profile_image` in request payload
- Validate it's a boolean if provided (default to `false`)
- Include in INSERT query
- Return the field in the response

**Updated Payload:**
```javascript
{
  name: "Group Name",
  description: "...",
  join_policy: "approval",
  visibility: "listed",
  theme_color: "indigo",
  require_profile_image: true  // NEW FIELD
}
```

### 2.2 Update Group Endpoint
**File:** `routes/groups/update_group.js`

**Changes:**
- Accept new optional field `require_profile_image`
- Validate it's a boolean if provided
- Include in UPDATE query (only if provided)

### 2.3 Get Group Endpoint
**File:** `routes/groups/get_group.js`

**Changes:**
- Ensure `require_profile_image` is included in SELECT query
- Return field in group object response

### 2.4 Join Group Endpoint (Critical)
**File:** `routes/groups/join_group.js`

**Changes:**
Add validation before creating the membership record:

```javascript
// After fetching group and before creating membership...

// Check if group requires profile image
if (group.require_profile_image) {
    // Fetch user's avatar_url
    const userResult = await query(
        'SELECT avatar_url FROM app_user WHERE id = $1',
        [userId]
    );

    const user = userResult.rows[0];

    if (!user.avatar_url) {
        return res.json({
            return_code: 'PROFILE_IMAGE_REQUIRED',
            message: 'This group requires members to have a profile image. Please update your profile before joining.'
        });
    }
}
```

**New Return Code:** `PROFILE_IMAGE_REQUIRED`

---

## 3. Web Frontend Changes (mwf-web)

### 3.1 Types Update
**File:** `src/lib/api/groups.ts` (or types file)

Update the `Group` interface:
```typescript
interface Group {
  // existing fields...
  require_profile_image: boolean;
}
```

### 3.2 Create Group Page
**File:** `src/app/groups/create/page.tsx`

**Changes:**
- Add state: `const [requireProfileImage, setRequireProfileImage] = useState(false);`
- Add UI toggle in the form (after Join Policy or Visibility section)
- Include in API payload

**Suggested UI:**
```tsx
{/* Require Profile Image */}
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700">
    Profile Image Requirement
  </label>
  <div className="flex items-center gap-3">
    <input
      type="checkbox"
      id="requireProfileImage"
      checked={requireProfileImage}
      onChange={(e) => setRequireProfileImage(e.target.checked)}
      className="h-4 w-4 text-indigo-600 rounded"
    />
    <label htmlFor="requireProfileImage" className="text-sm text-gray-600">
      Require members to have a profile image before joining
    </label>
  </div>
  <p className="text-xs text-gray-500 mt-1">
    Users without a profile image will be prompted to add one before they can join.
  </p>
</div>
```

### 3.3 Edit Group Page
**File:** `src/app/groups/[id]/edit/page.tsx`

**Changes:**
- Initialize state from fetched group: `useState(group.require_profile_image)`
- Add same UI toggle as create page
- Include in update API payload

### 3.4 Group Discovery/Join Flow
**File:** Group detail page where join button exists

**Changes:**
- Handle new `PROFILE_IMAGE_REQUIRED` return code
- Show appropriate error message with link to profile settings

```tsx
if (result.return_code === 'PROFILE_IMAGE_REQUIRED') {
    setError('This group requires a profile image. Please add one to your profile first.');
    // Optionally show a button/link to profile settings
}
```

### 3.5 API Client Update
**File:** `src/lib/api/groups.ts`

Update `createGroup` and `updateGroup` functions to accept the new field.

---

## 4. Flutter Changes (mwf-flutter)

### 4.1 Group Model Update
**File:** `lib/models/group.dart`

```dart
class Group {
  // existing fields...
  final bool requireProfileImage;

  Group({
    // existing params...
    this.requireProfileImage = false,
  });

  factory Group.fromJson(Map<String, dynamic> json) {
    return Group(
      // existing fields...
      requireProfileImage: json['require_profile_image'] ?? false,
    );
  }
}
```

### 4.2 Create Group Screen
**File:** `lib/screens/create_group_screen.dart`

**Changes:**
- Add state: `bool _requireProfileImage = false;`
- Add Switch/Checkbox widget in the form
- Include in API payload

**Suggested UI (Flutter):**
```dart
// After visibility or join policy section
SwitchListTile(
  title: const Text('Require Profile Image'),
  subtitle: const Text(
    'Members must have a profile photo to join',
    style: TextStyle(fontSize: 12),
  ),
  value: _requireProfileImage,
  onChanged: (value) => setState(() => _requireProfileImage = value),
  activeColor: Theme.of(context).primaryColor,
),
```

### 4.3 Edit Group Screen
**File:** `lib/screens/edit_group_screen.dart`

**Changes:**
- Accept new parameter `initialRequireProfileImage`
- Add state and UI toggle matching create screen
- Include in update API payload

### 4.4 Groups Service Update
**File:** `lib/services/groups_service.dart`

Update `createGroup()` and `updateGroup()` methods to accept and send `require_profile_image`.

### 4.5 Join Group Flow
**File:** `lib/screens/group_dashboard_screen.dart` (or wherever join is handled)

**Changes:**
- Handle new `PROFILE_IMAGE_REQUIRED` return code in `_handleJoinGroup()`
- Show dialog or snackbar with message
- Optionally navigate to profile edit screen

```dart
if (result.returnCode == 'PROFILE_IMAGE_REQUIRED') {
    ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text('This group requires a profile image. Please add one to your profile.'),
            action: SnackBarAction(
                label: 'Go to Profile',
                onPressed: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => EditProfileScreen())),
            ),
        ),
    );
    return;
}
```

---

## 5. Files to Modify Summary

### Database
| File | Action |
|------|--------|
| `docs/DB-Schema.sql` | Add column definition for documentation |
| New: `migrations/add_require_profile_image.sql` | Migration script |

### Backend (mwf-server)
| File | Action |
|------|--------|
| `routes/groups/create_group.js` | Accept & store new field |
| `routes/groups/update_group.js` | Accept & update new field |
| `routes/groups/get_group.js` | Return new field |
| `routes/groups/join_group.js` | Validate profile image requirement |

### Web Frontend (mwf-web)
| File | Action |
|------|--------|
| `src/lib/api/groups.ts` | Update types and API functions |
| `src/app/groups/create/page.tsx` | Add toggle UI |
| `src/app/groups/[id]/edit/page.tsx` | Add toggle UI |
| Group detail/join page | Handle new error code |

### Flutter (mwf-flutter)
| File | Action |
|------|--------|
| `lib/models/group.dart` | Add field to model |
| `lib/screens/create_group_screen.dart` | Add toggle UI |
| `lib/screens/edit_group_screen.dart` | Add toggle, accept new param |
| `lib/services/groups_service.dart` | Update API calls |
| `lib/screens/group_dashboard_screen.dart` | Handle join error |

---

## 6. Implementation Order

1. **Database** - Run migration to add column
2. **Backend APIs** - Update in order:
   - get_group.js (return field)
   - create_group.js (accept field)
   - update_group.js (accept field)
   - join_group.js (enforce validation)
3. **Web Frontend** - Update in order:
   - Types/API client
   - Create group page
   - Edit group page
   - Join error handling
4. **Flutter** - Update in order:
   - Group model
   - Groups service
   - Create group screen
   - Edit group screen
   - Join error handling

---

## 7. Testing Checklist

- [ ] Create group with `require_profile_image: false` - join works normally
- [ ] Create group with `require_profile_image: true` - user WITH avatar can join
- [ ] Create group with `require_profile_image: true` - user WITHOUT avatar gets blocked
- [ ] Edit group to toggle setting on/off
- [ ] Web: Error message shown when blocked, with guidance to update profile
- [ ] Flutter: Error handled with option to navigate to profile
- [ ] Existing groups unaffected (default false)
- [ ] Auto-join groups respect the profile image requirement
- [ ] Approval-required groups respect the profile image requirement (blocked before pending)

---

## 8. UX Considerations

1. **Clear Messaging:** When a user is blocked, explain clearly why and how to fix it
2. **Easy Navigation:** Provide direct link/button to profile editing
3. **Organiser Guidance:** Add tooltip or help text explaining the feature purpose
4. **No Retroactive Enforcement:** Existing members without avatars remain in the group

---

## 9. Edge Cases

| Scenario | Behavior |
|----------|----------|
| User removes avatar after joining | No effect - already a member |
| Organiser enables after members joined | No effect on existing members |
| User has avatar, then deletes, tries to join another group requiring it | Blocked |
| Empty string avatar_url | Treated as no avatar (check for null OR empty string) |
| Whitespace-only avatar_url | Treated as no avatar (trim and check) |
