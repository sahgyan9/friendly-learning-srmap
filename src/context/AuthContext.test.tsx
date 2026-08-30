import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";

// AuthProvider renders PresenceProvider, which opens a Realtime channel on
// mount. Without these the provider threw during the very first effect and
// every test in this file failed before it could assert anything.
const presenceChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  presenceState: vi.fn().mockReturnValue({}),
  track: vi.fn().mockResolvedValue(undefined),
  untrack: vi.fn().mockResolvedValue(undefined),
  send: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { onAuthStateChange: vi.fn(), signOut: vi.fn() },
    from: vi.fn(),
    // Loading a profile also asks is_admin_user; the provider treats a
    // rejection as "not an admin", so an unmocked rpc looked like a working
    // test right up until it rejected the whole Promise.all around it.
    rpc: vi.fn(() => Promise.resolve({ data: false, error: null })),
    channel: vi.fn(() => presenceChannel),
    removeChannel: vi.fn(),
  },
}));
vi.mock("@/lib/sentry", () => ({ setUserContext: vi.fn() }));
vi.mock("@/lib/theme", () => ({ setThemeUserId: vi.fn(), syncLocalTheme: vi.fn() }));

const onAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange);
const from = vi.mocked(supabase.from);

/** A single-row `.eq(...).maybeSingle()` builder that resolves to `result`. */
function singleRowBuilder(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnThis(),
  } as never;
}

function Probe() {
  const { profile, loading, isMentor, isAdmin } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="profile-name">{profile?.name ?? "none"}</span>
      <span data-testid="is-mentor">{String(isMentor)}</span>
      <span data-testid="is-admin">{String(isAdmin)}</span>
    </div>
  );
}

let authCallback: (event: string, session: unknown) => void;

beforeEach(() => {
  // The provider caches each profile it loads in localStorage and falls back
  // to it when the row cannot be read — correct in production, but it also
  // means the profile one test loads is still there for the next one, which
  // is exactly what the "row is missing" case is supposed to be without.
  localStorage.clear();
  onAuthStateChange.mockReset();
  from.mockReset();
  onAuthStateChange.mockImplementation((cb) => {
    authCallback = cb as never;
    return { data: { subscription: { unsubscribe: vi.fn() } } } as never;
  });
});

describe("AuthProvider", () => {
  it("starts with no session as not loading and no profile", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    authCallback("INITIAL_SESSION", null);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("profile-name")).toHaveTextContent("none");
  });

  it("loads the profile and marks isMentor when the user has a non-General mentor row", async () => {
    from.mockImplementation((table: string) => {
      if (table === "users") {
        return singleRowBuilder({
          data: { id: "u1", name: "Ada", email: "ada@example.com", role: "student" },
          error: null,
        });
      }
      if (table === "mentors") {
        return singleRowBuilder({ data: { department: "Computer Science" }, error: null });
      }
      throw new Error(`unexpected table ${table}`);
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    authCallback("INITIAL_SESSION", { user: { id: "u1" } });

    await waitFor(() => expect(screen.getByTestId("profile-name")).toHaveTextContent("Ada"));
    expect(screen.getByTestId("is-mentor")).toHaveTextContent("true");
    expect(screen.getByTestId("is-admin")).toHaveTextContent("false");
  });

  it("does not treat a mentor row with department 'General' as a mentor", async () => {
    from.mockImplementation((table: string) => {
      if (table === "users") {
        return singleRowBuilder({
          data: { id: "u1", name: "Ada", email: "ada@example.com", role: "student" },
          error: null,
        });
      }
      return singleRowBuilder({ data: { department: "General" }, error: null });
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    authCallback("INITIAL_SESSION", { user: { id: "u1" } });

    await waitFor(() => expect(screen.getByTestId("profile-name")).toHaveTextContent("Ada"));
    expect(screen.getByTestId("is-mentor")).toHaveTextContent("false");
  });

  it("clears the profile when the row is missing even after the retry", async () => {
    const usersBuilder = singleRowBuilder({ data: null, error: null });
    from.mockImplementation((table: string) => {
      if (table === "users") return usersBuilder;
      return singleRowBuilder({ data: null, error: null });
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    authCallback("INITIAL_SESSION", { user: { id: "u1" } });

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"), {
      timeout: 5000,
    });
    expect(screen.getByTestId("profile-name")).toHaveTextContent("none");
  }, 10000);
});
