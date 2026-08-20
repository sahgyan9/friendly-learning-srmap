import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOrCreateConversation } from "./conversation.service";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn() },
}));

const rpc = vi.mocked(supabase.rpc);

beforeEach(() => {
  rpc.mockReset();
});

describe("getOrCreateConversation", () => {
  it("returns the existing conversation without calling create_conversation", async () => {
    rpc.mockResolvedValueOnce({
      data: [{ id: "existing-convo" }],
      error: null,
    } as never);

    const result = await getOrCreateConversation("user-1", "user-2");

    expect(result).toEqual({ data: { id: "existing-convo" }, error: null });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("get_conversation", { user1: "user-1", user2: "user-2" });
  });

  it("creates a new conversation when none exists yet", async () => {
    rpc
      .mockResolvedValueOnce({ data: [], error: null } as never)
      .mockResolvedValueOnce({ data: { id: "new-convo" }, error: null } as never);

    const result = await getOrCreateConversation("user-1", "user-2");

    expect(result).toEqual({ data: { id: "new-convo" }, error: null });
    expect(rpc).toHaveBeenNthCalledWith(2, "create_conversation", {
      user1_id: "user-1",
      user2_id: "user-2",
    });
  });

  it("surfaces the lookup error without attempting to create a conversation", async () => {
    const fetchError = { message: "lookup failed" };
    rpc.mockResolvedValueOnce({ data: null, error: fetchError } as never);

    const result = await getOrCreateConversation("user-1", "user-2");

    expect(result).toEqual({ data: null, error: fetchError });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("surfaces the create error when the conversation still doesn't exist", async () => {
    const createError = { message: "create failed" };
    rpc
      .mockResolvedValueOnce({ data: [], error: null } as never)
      .mockResolvedValueOnce({ data: null, error: createError } as never);

    const result = await getOrCreateConversation("user-1", "user-2");

    expect(result).toEqual({ data: null, error: createError });
  });
});
