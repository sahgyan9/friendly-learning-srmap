import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOrCreateConversation } from "./conversation.service";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}));

const rpc = vi.mocked(supabase.rpc);
const from = vi.mocked(supabase.from);

// Chainable builder for the supabase.from(...) query-builder surface.
// getOrCreateConversation now hydrates its result (participant profiles +
// last message) before returning, so these tests need a `from` mock even
// though they're really exercising the get/create RPC flow — every
// select/eq/in call just returns the same builder, and it resolves to
// `result` whether awaited directly or via .maybeSingle().
interface ChainableResult {
  data: unknown;
  error: unknown;
}

interface ChainableBuilder {
  select: () => ChainableBuilder;
  in: () => ChainableBuilder;
  eq: () => ChainableBuilder;
  maybeSingle: () => Promise<ChainableResult>;
  then: (resolve: (value: ChainableResult) => void) => void;
}

function chainable(result: ChainableResult): ChainableBuilder {
  const builder: ChainableBuilder = {
    select: () => builder,
    in: () => builder,
    eq: () => builder,
    maybeSingle: () => Promise.resolve(result),
    then: (resolve) => resolve(result),
  };
  return builder;
}

beforeEach(() => {
  rpc.mockReset();
  from.mockReset();
  // Default: participant-profile and last-message lookups find nothing.
  // These tests assert on the get/create RPC flow, not on profile hydration.
  from.mockImplementation(((table: string) =>
    table === "messages"
      ? chainable({ data: null, error: null })
      : chainable({ data: [], error: null })) as never);
});

describe("getOrCreateConversation", () => {
  it("returns the existing conversation without calling create_conversation", async () => {
    rpc.mockImplementation(((fn: string) => {
      if (fn === "get_conversation") {
        return Promise.resolve({
          data: [{ id: "existing-convo", user1_id: "user-1", user2_id: "user-2", last_message_id: null, last_updated: "now" }],
          error: null,
        });
      }
      if (fn === "chat_participant_profiles") {
        return Promise.resolve({ data: [], error: null });
      }
      throw new Error(`Unexpected rpc call: ${fn}`);
    }) as never);

    const result = await getOrCreateConversation("user-1", "user-2");

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ id: "existing-convo" });
    expect(rpc).toHaveBeenCalledWith("get_conversation", { user1: "user-1", user2: "user-2" });
    expect(rpc).not.toHaveBeenCalledWith("create_conversation", expect.anything());
  });

  it("creates a new conversation when none exists yet", async () => {
    rpc.mockImplementation(((fn: string) => {
      if (fn === "get_conversation") {
        return Promise.resolve({ data: [], error: null });
      }
      if (fn === "create_conversation") {
        return Promise.resolve({
          data: { id: "new-convo", user1_id: "user-1", user2_id: "user-2", last_message_id: null, last_updated: "now" },
          error: null,
        });
      }
      if (fn === "chat_participant_profiles") {
        return Promise.resolve({ data: [], error: null });
      }
      throw new Error(`Unexpected rpc call: ${fn}`);
    }) as never);

    const result = await getOrCreateConversation("user-1", "user-2");

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ id: "new-convo" });
    expect(rpc).toHaveBeenCalledWith("create_conversation", {
      user1_id: "user-1",
      user2_id: "user-2",
    });
  });

  it("surfaces the lookup error without attempting to create a conversation", async () => {
    const fetchError = { message: "lookup failed" };
    rpc.mockImplementation(((fn: string) => {
      if (fn === "get_conversation") {
        return Promise.resolve({ data: null, error: fetchError });
      }
      throw new Error(`Unexpected rpc call: ${fn}`);
    }) as never);

    const result = await getOrCreateConversation("user-1", "user-2");

    expect(result).toEqual({ data: null, error: fetchError });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("surfaces the create error when the conversation still doesn't exist", async () => {
    const createError = { message: "create failed" };
    rpc.mockImplementation(((fn: string) => {
      if (fn === "get_conversation") {
        return Promise.resolve({ data: [], error: null });
      }
      if (fn === "create_conversation") {
        return Promise.resolve({ data: null, error: createError });
      }
      throw new Error(`Unexpected rpc call: ${fn}`);
    }) as never);

    const result = await getOrCreateConversation("user-1", "user-2");

    expect(result).toEqual({ data: null, error: createError });
  });
});
