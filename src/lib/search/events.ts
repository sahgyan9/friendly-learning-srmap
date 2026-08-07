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

/**
 * Asks the header's search dialog to open, from anywhere on the page.
 *
 * The hero's ask box is the reason this exists. It is a second door onto the
 * same room — deliberately not a /search page, because a destination page has
 * to be found before it can be used, which is the problem we are solving. The
 * dialog owns its own open state in the header; this event is how something
 * further down the page reaches it without either component importing the
 * other.
 */
export const OPEN_SEARCH_EVENT = "fl:open-search";
