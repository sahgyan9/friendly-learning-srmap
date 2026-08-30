/**
 * Fired by whatever marks messages as read, so the navbar badge can drop
 * immediately instead of waiting on a realtime round-trip.
 *
 * A plain DOM event rather than context or a store: the badge and the message
 * list are on opposite sides of the tree and share no provider, and this is a
 * one-way "something changed, go and look" nudge with no payload to keep in
 * sync. The count is still re-read from the database either way — this only
 * decides when.
 */
export const MESSAGES_READ_EVENT = "fl:messages-read";

export const announceMessagesRead = () => {
  window.dispatchEvent(new CustomEvent(MESSAGES_READ_EVENT));
};

/**
 * Fired when the outbox manages to send something, so an open conversation can
 * replace the queued copy with the real message instead of waiting on a
 * realtime event it may not be subscribed for. Same reasoning as above: a
 * nudge, not a payload.
 */
export const MESSAGES_SENT_EVENT = "fl:messages-sent";

export const announceMessagesSent = () => {
  window.dispatchEvent(new CustomEvent(MESSAGES_SENT_EVENT));
};
