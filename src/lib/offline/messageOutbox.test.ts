import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  retryQueuedMessage,
  enqueueMessage,
  flushOutbox,
  getOutbox,
  getOutboxForConversation,
  outboxMessageToChatMessage,
  subscribeToOutbox,
} from "./messageOutbox";

const sendMessage = vi.fn();
const getConversationMessages = vi.fn();

vi.mock("@/integrations/supabase/services/chat", () => ({
  sendMessage: (...args: unknown[]) => sendMessage(...args),
  getConversationMessages: (...args: unknown[]) => getConversationMessages(...args),
}));

function queue(content: string, conversationId = "c1") {
  return enqueueMessage({
    conversationId,
    senderId: "me",
    receiverId: "them",
    content,
    replyToId: null,
    replyTo: null,
  });
}

function setOnline(online: boolean) {
  Object.defineProperty(navigator, "onLine", { value: online, configurable: true });
}

beforeEach(() => {
  localStorage.clear();
  sendMessage.mockReset();
  getConversationMessages.mockReset();
  sendMessage.mockResolvedValue({ data: { id: "server-id" }, error: null });
  getConversationMessages.mockResolvedValue({ data: [], error: null });
  setOnline(true);
});

afterEach(() => {
  setOnline(true);
});

describe("the message outbox", () => {
  it("survives a reload, because the queue is the whole point", () => {
    queue("written on the metro");

    const stored = localStorage.getItem("fl_offline_cache:message_outbox");
    expect(stored).toContain("written on the metro");
    expect(getOutbox()).toHaveLength(1);
  });

  it("keeps queued messages separated by conversation", () => {
    queue("to c1", "c1");
    queue("to c2", "c2");

    expect(getOutboxForConversation("c1").map((m) => m.content)).toEqual(["to c1"]);
    expect(getOutboxForConversation("c2").map((m) => m.content)).toEqual(["to c2"]);
  });

  it("shows a queued message as pending rather than sent", () => {
    const rendered = outboxMessageToChatMessage(queue("hello"));

    expect(rendered.delivery_status).toBe("queued");
    expect(rendered.id.startsWith("outbox-")).toBe(true);
  });

  it("sends what is queued and empties itself", async () => {
    queue("first");
    queue("second");

    const result = await flushOutbox();

    expect(result).toEqual({ sent: 2, remaining: 0 });
    expect(sendMessage).toHaveBeenCalledTimes(2);
    // Order matters in a conversation: they go out as they were written.
    expect(sendMessage.mock.calls.map((call) => call[3])).toEqual(["first", "second"]);
    expect(getOutbox()).toHaveLength(0);
  });

  it("does nothing while offline instead of burning attempts", async () => {
    queue("no signal");
    setOnline(false);

    expect(await flushOutbox()).toEqual({ sent: 0, remaining: 1 });
    expect(sendMessage).not.toHaveBeenCalled();
    expect(getOutbox()[0].attempts).toBe(0);
  });

  it("stops at the first failure so the rest keep their order", async () => {
    queue("first");
    queue("second");
    sendMessage.mockResolvedValueOnce({ data: null, error: { message: "Failed to fetch" } });

    const result = await flushOutbox();

    expect(result).toEqual({ sent: 0, remaining: 2 });
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(getOutbox()[0].attempts).toBe(1);
    expect(getOutbox()[0].failed).toBe(false);
  });

  it("gives up after five attempts and says so, rather than retrying forever", async () => {
    queue("refused");
    sendMessage.mockResolvedValue({ data: null, error: { message: "row-level security" } });

    for (let attempt = 0; attempt < 5; attempt += 1) await flushOutbox();

    const [entry] = getOutbox();
    expect(entry.attempts).toBe(5);
    expect(entry.failed).toBe(true);
    expect(outboxMessageToChatMessage(entry).delivery_status).toBe("failed");

    // And it is left alone from then on.
    sendMessage.mockClear();
    await flushOutbox();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("does not send twice when the first attempt landed but the reply was lost", async () => {
    const queued = queue("did this send?");
    sendMessage.mockResolvedValueOnce({ data: null, error: { message: "Failed to fetch" } });
    await flushOutbox();
    expect(getOutbox()[0].attempts).toBe(1);

    // It had in fact arrived — the response just never came back.
    getConversationMessages.mockResolvedValue({
      data: [
        {
          id: "server-id",
          sender_id: "me",
          content: "did this send?",
          sent_at: queued.queuedAt,
        },
      ],
      error: null,
    });
    sendMessage.mockClear();

    const result = await flushOutbox();

    expect(sendMessage).not.toHaveBeenCalled();
    expect(result.sent).toBe(1);
    expect(getOutbox()).toHaveLength(0);
  });

  it("still sends the same text twice when the user genuinely wrote it twice", async () => {
    // Both are first attempts, so neither consults the conversation — which is
    // the only thing standing between a repeated "ok" and a swallowed message.
    queue("ok");
    queue("ok");
    getConversationMessages.mockResolvedValue({
      data: [{ id: "s1", sender_id: "me", content: "ok", sent_at: new Date().toISOString() }],
      error: null,
    });

    await flushOutbox();

    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(getOutbox()).toHaveLength(0);
  });

  it("gives a message that gave up one more attempt when tapped", async () => {
    queue("please go");
    sendMessage.mockResolvedValue({ data: null, error: { message: "Failed to fetch" } });
    for (let attempt = 0; attempt < 5; attempt += 1) await flushOutbox();
    expect(getOutbox()[0].failed).toBe(true);

    sendMessage.mockClear();
    sendMessage.mockResolvedValue({ data: { id: "server-id" }, error: null });
    retryQueuedMessage(`outbox-${getOutbox()[0].localId}`);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(getOutbox()).toHaveLength(0);
  });

  it("still checks for a duplicate when retrying by hand", async () => {
    const queued = queue("did this send?");
    sendMessage.mockResolvedValue({ data: null, error: { message: "Failed to fetch" } });
    for (let attempt = 0; attempt < 5; attempt += 1) await flushOutbox();

    // It had landed all along — which is exactly why a manual retry must not
    // be treated as a first attempt.
    getConversationMessages.mockResolvedValue({
      data: [{ id: "s1", sender_id: "me", content: "did this send?", sent_at: queued.queuedAt }],
      error: null,
    });
    sendMessage.mockClear();

    retryQueuedMessage(`outbox-${queued.localId}`);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(sendMessage).not.toHaveBeenCalled();
    expect(getOutbox()).toHaveLength(0);
  });

  it("ignores a retry for a message that is not in the queue", async () => {
    retryQueuedMessage("outbox-does-not-exist");
    retryQueuedMessage("a-real-server-message-id");
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("tells the open conversation when the queue changes", async () => {
    const seen: number[] = [];
    const unsubscribe = subscribeToOutbox((messages) => seen.push(messages.length));

    queue("one");
    await flushOutbox();
    unsubscribe();
    queue("after unsubscribing");

    expect(seen).toEqual([1, 0]);
  });
});
