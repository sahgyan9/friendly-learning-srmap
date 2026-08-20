import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { toast } from "sonner";
import { useMentorConnection } from "./use-mentor-connection";
import { getMentorById } from "@/integrations/supabase/services/mentors";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat";

vi.mock("@/integrations/supabase/services/mentors", () => ({
  getMentorById: vi.fn(),
}));
vi.mock("@/integrations/supabase/services/chat", () => ({
  getOrCreateConversation: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const USER_ID = "user-1";
const MENTOR_ID = "mentor-1";

function renderWithMentorParam(mentorId: string, setActiveChat = vi.fn()) {
  return renderHook(() => useMentorConnection(USER_ID, setActiveChat), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[`/?mentor=${mentorId}`]}>{children}</MemoryRouter>
    ),
  });
}

beforeEach(() => {
  vi.mocked(getMentorById).mockReset();
  vi.mocked(getOrCreateConversation).mockReset();
  vi.mocked(toast.error).mockReset();
  vi.mocked(toast.success).mockReset();
});

describe("useMentorConnection", () => {
  it("shows an error and does not open a chat when the mentor does not exist", async () => {
    vi.mocked(getMentorById).mockResolvedValue({
      data: null,
      error: { message: "not found" } as never,
    });
    const setActiveChat = vi.fn();

    renderWithMentorParam(MENTOR_ID, setActiveChat);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Mentor not found or is no longer available"));
    expect(setActiveChat).not.toHaveBeenCalled();
    expect(getOrCreateConversation).not.toHaveBeenCalled();
  });

  it("blocks a user from messaging themselves", async () => {
    vi.mocked(getMentorById).mockResolvedValue({
      data: { id: USER_ID, name: "Self" } as never,
      error: null,
    });
    const setActiveChat = vi.fn();

    // The current user's own id as the mentor id in the URL.
    renderWithMentorParam(USER_ID, setActiveChat);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("You cannot message yourself"));
    expect(setActiveChat).not.toHaveBeenCalled();
    expect(getOrCreateConversation).not.toHaveBeenCalled();
  });

  it("opens the conversation and reports success once the mentor and conversation resolve", async () => {
    vi.mocked(getMentorById).mockResolvedValue({
      data: { id: MENTOR_ID, name: "Dr. Mentor" } as never,
      error: null,
    });
    vi.mocked(getOrCreateConversation).mockResolvedValue({
      data: { id: "conversation-1" } as never,
      error: null,
    });
    const setActiveChat = vi.fn();

    renderWithMentorParam(MENTOR_ID, setActiveChat);

    await waitFor(() => expect(setActiveChat).toHaveBeenCalledWith("conversation-1"));
    expect(getOrCreateConversation).toHaveBeenCalledWith(USER_ID, MENTOR_ID);
    expect(toast.success).toHaveBeenCalledWith("Connected with Dr. Mentor. You can now start messaging!");
  });

  it("reports failure when the conversation cannot be created", async () => {
    vi.mocked(getMentorById).mockResolvedValue({
      data: { id: MENTOR_ID, name: "Dr. Mentor" } as never,
      error: null,
    });
    vi.mocked(getOrCreateConversation).mockResolvedValue({
      data: null,
      error: { message: "db error" } as never,
    });
    const setActiveChat = vi.fn();

    renderWithMentorParam(MENTOR_ID, setActiveChat);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to start conversation with mentor"));
    expect(setActiveChat).not.toHaveBeenCalled();
  });
});
