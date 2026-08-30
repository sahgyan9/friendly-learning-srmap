import { useEffect } from "react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { flushOutbox, getOutbox } from "@/lib/offline/messageOutbox";

/**
 * Sends whatever the outbox is holding, as soon as sending is possible again.
 *
 * Mounted once at app level rather than on the messages page. A message
 * written offline should go out when the connection returns whether or not
 * that conversation — or the chat screen at all — happens to be open, and
 * waiting for the user to navigate back to it is exactly the delay that makes
 * people think their message was lost.
 *
 * Three moments are worth trying on: the app opening, the browser reporting
 * it is back online, and the tab becoming visible again. The last one covers
 * the phone case, where an app in the background often misses the `online`
 * event entirely.
 */
const MessageOutboxSync = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    // send_message runs as the signed-in user; without a session every
    // attempt would fail and burn one of the entry's retries.
    if (!userId) return;

    let cancelled = false;

    const flush = async () => {
      if (getOutbox().length === 0) return;

      const { sent } = await flushOutbox();
      if (cancelled || sent === 0) return;

      toast.success(sent === 1 ? "Your message was sent." : `${sent} messages sent.`);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void flush();
    };

    void flush();
    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [userId]);

  return null;
};

export default MessageOutboxSync;
