# Flutter API Configuration

## Location
`mwf-flutter/lib/services/api_service.dart` (line 4-6)

## Switching Environments

Comment/uncomment the appropriate line:

```dart
// Local development
static const String baseUrl = 'http://192.168.1.136:3019/api';

// VPS production
static const String baseUrl = 'https://meetwithfriends.noodev8.com/api';
```

## Current: VPS (https://meetwithfriends.noodev8.com)
