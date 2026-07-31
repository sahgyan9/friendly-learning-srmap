/**
 * Search can reach things that are not pages. The notification bell is a
 * popover living in the header with its own local open state, so "notifications"
 * in the search results asks it to open rather than navigating anywhere — there
 * is no /notifications route to send anyone to.
 *
 * A window event keeps the two components independent: search does not need a
 * ref to the bell, and the bell does not need to know search exists.
 */
export const OPEN_NOTIFICATIONS_EVENT = "fl:open-notifications";
