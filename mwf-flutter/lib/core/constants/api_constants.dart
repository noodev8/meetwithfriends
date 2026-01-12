abstract final class ApiConstants {
  static const String baseUrl = 'http://localhost:3018';

  // Auth endpoints
  static const String login = '/api/auth/login';
  static const String register = '/api/auth/register';
  static const String forgotPassword = '/api/auth/forgot-password';
  static const String resetPassword = '/api/auth/reset-password';

  // User endpoints
  static const String currentUser = '/api/users/me';
  static const String updateProfile = '/api/users/me';
  static const String myGroups = '/api/users/my-groups';
  static const String myEvents = '/api/users/my-events';

  // Group endpoints
  static const String groups = '/api/groups';
  static String groupById(int id) => '/api/groups/$id';
  static String groupMembers(int id) => '/api/groups/$id/members';
  static String groupEvents(int id) => '/api/groups/$id/events';
  static String joinGroup(int id) => '/api/groups/$id/join';
  static String leaveGroup(int id) => '/api/groups/$id/leave';

  // Event endpoints
  static const String events = '/api/events';
  static String eventById(int id) => '/api/events/$id';
  static String eventRsvp(int id) => '/api/events/$id/rsvp';
  static String eventAttendees(int id) => '/api/events/$id/attendees';
  static String eventComments(int id) => '/api/events/$id/comments';
  static String eventContactHost(int id) => '/api/events/$id/contact-host';
  static String eventSubmitOrder(int id) => '/api/events/$id/submit-order';
  static String groupPastEvents(int groupId) =>
      '/api/events?group_id=$groupId&past=true';

  // Comment endpoints
  static const String comments = '/api/comments';
  static String deleteComment(int id) => '/api/comments/$id';

  // Contact endpoints
  static String groupContactOrganiser(int id) =>
      '/api/groups/$id/contact-organiser';

  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
}
