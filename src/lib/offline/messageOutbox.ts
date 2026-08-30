/**
 * The outbox: messages written while offline, held on the device until they
 * can be sent.
 *
 * Before this, sending with no connection failed, showed a toast, and threw
 * the text away — the one moment where losing what someone wrote is least
 * forgivable, because they had no way to know it would happen.
 *
 * ## Why sends are not simply retried
 *
 * `send_message` mints the message id server-side, so the client has no key to
 * make a retry idempotent with. That leaves one genuinely dangerous case: the
 * request arrives, Postgres commits it, and the response is lost on the way
 * back. To the sender that is indistinguishable from never having sent, and a
 * naive retry posts the message twice.
 *
 * So a retry — and only a retry, never a first attempt — first looks at the
 * conversation for a message from the same sender with the same text around
 * the same time. If one is there, the earlier attempt did land and the entry
 * is dropped. Restricting this to retries is what keeps someone who types
 * "ok" twice from having the second one swallowed: each queued message always
 * gets one clean attempt of its own.
 *
 * A message that has failed MAX_ATTEMPTS times stops being retried and stays
 * on screen marked as not sent. Retrying forever would hide a message that is
 * being refused for a reason connectivity will never fix.
 */

import { getOfflineCache, setOfflineCache, clearOfflineCache } from "@/lib/offline/offlineStorage";
import type { Message } from "@/types/chat";
import { announceMessagesSent } from "@/lib/message-events";
import {
  sendMessage as sendMessageApi,
  getConversationMessages,
} from "@/integrations/supabase/services/chat";

const OUTBOX_CACHE_KEY = "message_outbox";

/** Attempts before a message is left alone and shown as not sent. */
const MAX_ATTEMPTS = 5;

/**
 * How far either side of the queued time to look when deciding whether a
 * retry's message is already there. Wide enough to cover a request that hung
 * before failing, narrow enough not to catch a genuine repeat of the same
 * text minutes later.
 */
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

export interface OutboxMessage {
  /** Local id. Not the message id — the server mints that on arrival. */
  localId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  replyToId: string | null;
  replyTo: { id: string; sender_name: string; content: string } | null;
  queuedAt: string;
  attempts: number;
  lastError?: string;
  /** Set once the attempts are used up; nothing retries it after that. */
  failed?: boolean;
}

type Listener = (messages: OutboxMessage[]) => void;

const listeners = new Set<Listener>();

function read(): OutboxMessage[] {
  const cached = getOfflineCache<OutboxMessage[]>(OUTBOX_CACHE_KEY);
  return Array.isArray(cached?.data) ? cached.data : [];
}

function write(messages: OutboxMessage[]) {
  if (messages.length === 0) {
    clearOfflineCache(OUTBOX_CACHE_KEY);
  } else {
    setOfflineCache(OUTBOX_CACHE_KEY, messages);
  }
  for (const listener of listeners) listener(messages);
}

/** Everything still waiting to be sent, oldest first. */
export function getOutbox(): OutboxMessage[] {
  return read();
}

export function getOutboxForConversation(conversationId: string): OutboxMessage[] {
  return read().filter((message) => message.conversationId === conversationId);
}

/** Fires on every change, so an open conversation can re-render its pending messages. */
export function subscribeToOutbox(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function enqueueMessage(
  message: Omit<OutboxMessage, "localId" | "queuedAt" | "attempts">,
): OutboxMessage {
  const queued: OutboxMessage = {
    ...message,
    localId: crypto.randomUUID(),
    queuedAt: new Date().toISOString(),
    attempts: 0,
  };

  write([...read(), queued]);
  return queued;
}

export function removeFromOutbox(localId: string) {
  write(read().filter((message) => message.localId !== localId));
}

function update(localId: string, changes: Partial<OutboxMessage>) {
  write(read().map((message) => (message.localId === localId ? { ...message, ...changes } : message)));
}

/**
 * Has this already landed? Asked only before a retry — see the note at the top
 * of the file for why a first attempt must never ask.
 */
async function alreadyDelivered(message: OutboxMessage): Promise<boolean> {
  const { data, error } = await getConversationMessages(message.conversationId);
  if (error || !data) return false;

  const queuedAt = new Date(message.queuedAt).getTime();

  return data.some((existing) => {
    if (existing.sender_id !== message.senderId) return false;
    if (existing.content !== message.content) return false;
    const sentAt = new Date(existing.sent_at).getTime();
    return Math.abs(sentAt - queuedAt) < DUPLICATE_WINDOW_MS;
  });
}

let flushing = false;

/**
 * Send whatever is queued, oldest first.
 *
 * Stops at the first failure rather than working through the rest: they are
 * almost always failing for the same reason, and stopping keeps a
 * conversation's messages in the order they were written.
 */
export async function flushOutbox(): Promise<{ sent: number; remaining: number }> {
  if (flushing) return { sent: 0, remaining: read().length };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { sent: 0, remaining: read().length };
  }

  flushing = true;
  let sent = 0;

  try {
    for (const message of read()) {
      if (message.failed) continue;

      if (message.attempts > 0 && (await alreadyDelivered(message))) {
        removeFromOutbox(message.localId);
        sent += 1;
        continue;
      }

      const { error } = await sendMessageApi(
        message.conversationId,
        message.senderId,
        message.receiverId,
        message.content,
        message.replyToId,
      );

      if (error) {
        const attempts = message.attempts + 1;
        update(message.localId, {
          attempts,
          lastError: error.message ?? String(error),
          failed: attempts >= MAX_ATTEMPTS,
        });
        break;
      }

      removeFromOutbox(message.localId);
      sent += 1;
    }
  } finally {
    flushing = false;
  }

  // Whoever is showing this conversation now has a queued message that is no
  // longer queued and a real one they have never seen. Nudge them to re-read
  // rather than trusting a realtime event to arrive for the sender's own
  // insert.
  if (sent > 0 && typeof window !== "undefined") {
    announceMessagesSent();
  }

  return { sent, remaining: read().length };
}

/**
 * Turn a queued message into something the conversation can render, so a
 * message written offline stays visible in the thread it belongs to instead
 * of vanishing until it sends.
 */
export function outboxMessageToChatMessage(message: OutboxMessage): Message {
  return {
    id: `outbox-${message.localId}`,
    conversation_id: message.conversationId,
    sender_id: message.senderId,
    receiver_id: message.receiverId,
    content: message.content,
    sent_at: message.queuedAt,
    is_read: false,
    delivery_status: message.failed ? "failed" : "queued",
    reply_to_id: message.replyToId,
    reply_to: message.replyTo,
  };
}

/** True for a message this module is holding rather than one the server has. */
export function isOutboxMessageId(id: string): boolean {
  return id.startsWith("outbox-");
}
