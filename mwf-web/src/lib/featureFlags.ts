/**
 * Feature Flags
 *
 * Toggle features on/off without removing code.
 * Set to true to re-enable a feature.
 */

/**
 * FEATURE_GUESTS_ENABLED
 *
 * When enabled, allows members to bring additional guests (+1s) to events.
 * Hosts can configure max guests per RSVP (1-5) when creating/editing events.
 *
 * Disabled to simplify initial release (avoids waitlist/payment complications).
 * Backend still supports guests - this only hides the UI.
 */
export const FEATURE_GUESTS_ENABLED = false;
