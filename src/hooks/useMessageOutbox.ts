import { useEffect, useState } from "react";

import {
  getOutbox,
  getOutboxForConversation,
  subscribeToOutbox,
  type OutboxMessage,
} from "@/lib/offline/messageOutbox";

/**
 * Read the outbox from a component and re-render when it changes.
 *
 * The outbox is a module-level store rather than React state, because a
 * message queued on the chat screen has to be visible to the conversation
 * list and to the app-level sync, which share no provider with it. These
 * hooks are the bridge; subscribing is what keeps a queued message from
 * needing a refresh to appear.
 */
export function useOutboxMessages(): OutboxMessage[] {
  const [messages, setMessages] = useState<OutboxMessage[]>(getOutbox);

  useEffect(() => {
    setMessages(getOutbox());
    return subscribeToOutbox(setMessages);
  }, []);

  return messages;
}

export function useOutboxForConversation(conversationId: string | null): OutboxMessage[] {
  const [messages, setMessages] = useState<OutboxMessage[]>([]);

  useEffect(() => {
    const sync = () => setMessages(conversationId ? getOutboxForConversation(conversationId) : []);
    sync();
    return subscribeToOutbox(sync);
  }, [conversationId]);

  return messages;
}
