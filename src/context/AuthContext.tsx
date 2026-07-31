import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { setUserContext } from "@/lib/sentry";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  profile_image?: string;
  verification_status?: string;
  is_admin?: boolean;
  mobile?: string;
  department?: string;
  skills?: string[];
  linkedin_url?: string;
  bio?: string;
  phone?: string;
  is_available?: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  signOut: () => Promise<void>;
  loading: boolean;
  isMentor: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMentor, setIsMentor] = useState(false);

  // Which user id we have already loaded a profile for. Guards against
  // re-fetching on every TOKEN_REFRESHED / tab-focus event, which fired a pair
  // of queries roughly hourly and on every window refocus.
  const loadedUserId = useRef<string | null>(null);

  const clearProfile = useCallback(() => {
    loadedUserId.current = null;
    setProfile(null);
    setIsMentor(false);
    setUserContext(null);
  }, []);

  const fetchUserProfile = useCallback(
    async (userId: string, authUser?: User | null) => {
      try {
        const [{ data: profileData, error: profileError }, { data: mentorData }] = await Promise.all([
          supabase.from("users").select("*").eq("id", userId).maybeSingle(),
          supabase.from("mentors").select("department").eq("id", userId).maybeSingle(),
        ]);

        if (profileError || !profileData) {
          clearProfile();
          return;
        }

        // Automatically populate Google profile image if user has no profile photo set
        const googleAvatar =
          authUser?.user_metadata?.avatar_url ||
          authUser?.user_metadata?.picture;

        if (!profileData.profile_image && googleAvatar) {
          profileData.profile_image = googleAvatar;
          void supabase
            .from("users")
            .update({ profile_image: googleAvatar })
            .eq("id", userId);
        }

        loadedUserId.current = userId;
        setProfile(profileData);
        setUserContext({ id: profileData.id, email: profileData.email, name: profileData.name });

        // "General" is the placeholder department auto-created rows get, so it
        // does not count as a real mentor profile.
        setIsMentor(Boolean(mentorData?.department && mentorData.department !== "General"));
      } catch {
        clearProfile();
      } finally {
        setLoading(false);
      }
    },
    [clearProfile],
  );

  useEffect(() => {
    // onAuthStateChange fires an INITIAL_SESSION event on subscribe, so it is
    // the single source of truth. The previous implementation also called
    // getSession() and kicked off a second, parallel profile fetch for the same
    // user on every page load.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      const nextUserId = nextSession?.user?.id ?? null;

      if (!nextUserId) {
        clearProfile();
        setLoading(false);
        return;
      }

      if (loadedUserId.current === nextUserId) {
        setLoading(false);
        return;
      }

      // Deferred to a microtask: Supabase warns against awaiting other client
      // calls synchronously inside this callback.
      void Promise.resolve().then(() => fetchUserProfile(nextUserId, nextSession?.user));
    });

    return () => subscription.unsubscribe();
  }, [clearProfile, fetchUserProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      loadedUserId.current = null;
      await fetchUserProfile(user.id);
    }
  }, [user, fetchUserProfile]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Sign-out failures are non-fatal; the local session is cleared either way.
    }
    clearProfile();
  }, [clearProfile]);

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user,
      profile,
      signOut,
      loading,
      isMentor,
      isAdmin: profile?.is_admin === true,
      refreshProfile,
    }),
    [session, user, profile, signOut, loading, isMentor, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
