import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { PresenceProvider } from "@/context/PresenceContext";
import { setUserContext } from "@/lib/sentry";
import { setThemeUserId, syncLocalTheme, type Theme } from "@/lib/theme";
import { getOfflineCache, setOfflineCache, clearOfflineCache } from "@/lib/offline/offlineStorage";

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
  is_available?: boolean;
  theme?: string | null;
  has_seen_welcome_tour?: boolean;
  date_of_birth_linked?: boolean;
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

  // Presence is handled by PresenceProvider below (WebSocket channel.track, zero DB writes).

  // Which user id we have already loaded a profile for. Guards against
  // re-fetching on every TOKEN_REFRESHED / tab-focus event, which fired a pair
  // of queries roughly hourly and on every window refocus.
  const loadedUserId = useRef<string | null>(null);

  const clearProfile = useCallback(() => {
    loadedUserId.current = null;
    setProfile(null);
    setIsMentor(false);
    setUserContext(null);
    setThemeUserId(null);
  }, []);

  const PROFILE_COLUMNS =
    "id,name,email,role,profile_image,verification_status,is_admin,mobile,department,skills,linkedin_url,bio,is_available,theme,has_seen_welcome_tour,date_of_birth_linked" as const;

  const applyProfile = (
    resolvedProfile: UserProfile,
    mentorDepartment: string | null | undefined,
    userId: string,
    authUser?: User | null,
  ) => {
    const googleAvatar =
      authUser?.user_metadata?.avatar_url ||
      authUser?.user_metadata?.picture;

    if (!resolvedProfile.profile_image && googleAvatar) {
      resolvedProfile.profile_image = googleAvatar;
      void supabase.from("users").update({ profile_image: googleAvatar }).eq("id", userId);
      void supabase.from("mentors").update({ profile_image: googleAvatar }).eq("id", userId);
    }

    loadedUserId.current = userId;
    setProfile(resolvedProfile);
    setUserContext({ id: resolvedProfile.id, email: resolvedProfile.email, name: resolvedProfile.name });
    setThemeUserId(userId);
    if (resolvedProfile.theme === "dark" || resolvedProfile.theme === "light") {
      syncLocalTheme(resolvedProfile.theme as Theme);
    }
    setIsMentor(Boolean(mentorDepartment && mentorDepartment !== "General"));
    setOfflineCache(`profile:${userId}`, { profile: resolvedProfile, mentorDepartment });
  };

  const fetchUserProfile = useCallback(
    async (userId: string, authUser?: User | null) => {
      // Restore offline profile immediately if available so UI doesn't flicker/block
      const cached = getOfflineCache<{ profile: UserProfile; mentorDepartment?: string }>(`profile:${userId}`);
      if (cached?.data?.profile && !profile) {
        applyProfile(cached.data.profile, cached.data.mentorDepartment, userId, authUser);
      }

      try {
        const [
          { data: profileData, error: profileError },
          { data: mentorData },
          adminRpcResult,
        ] = await Promise.all([
          supabase.from("users").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle(),
          supabase.from("mentors").select("department").eq("id", userId).maybeSingle(),
          supabase.rpc("is_admin_user", { user_id: userId }).then(
            (res) => res.data === true,
            () => false,
          ),
        ]);

        // If the row is missing this is almost always a brand-new OAuth user
        // whose public.users row is still being written by the
        // handle_new_user trigger. Retrying with a 2-step backoff allows the
        // DB trigger to commit even under high latency or cold starts.
        if (profileError || !profileData) {
          // If offline / network error occurred but we have cached profile, keep it
          if (cached?.data?.profile) {
            applyProfile(cached.data.profile, cached.data.mentorDepartment, userId, authUser);
            return;
          }

          if (!profileError) {
            for (const delay of [400, 800]) {
              await new Promise((r) => setTimeout(r, delay));
              const { data: retryData, error: retryError } = await supabase
                .from("users")
                .select(PROFILE_COLUMNS)
                .eq("id", userId)
                .maybeSingle();
              if (!retryError && retryData) {
                if (adminRpcResult || retryData.role === "admin") {
                  retryData.is_admin = true;
                }
                applyProfile(retryData, mentorData?.department, userId, authUser);
                return;
              }
            }
          }
          clearProfile();
          return;
        }

        if (adminRpcResult || profileData.role === "admin") {
          profileData.is_admin = true;
        }

        applyProfile(profileData, mentorData?.department, userId, authUser);
      } catch {
        if (cached?.data?.profile) {
          applyProfile(cached.data.profile, cached.data.mentorDepartment, userId, authUser);
        } else {
          clearProfile();
        }
      } finally {
        setLoading(false);
      }
    },
    [clearProfile, profile],
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
    if (user?.id) {
      clearOfflineCache(`profile:${user.id}`);
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // Sign-out failures are non-fatal; the local session is cleared either way.
    }
    clearProfile();
  }, [clearProfile, user]);

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user,
      profile,
      signOut,
      loading,
      isMentor,
      isAdmin: profile?.is_admin === true || profile?.role === "admin",
      refreshProfile,
    }),
    [session, user, profile, signOut, loading, isMentor, refreshProfile],
  );

  return (
    <AuthContext.Provider value={value}>
      {/* PresenceProvider sits inside AuthProvider so it can read user?.id
          and manage a single shared WebSocket presence channel for the whole app. */}
      <PresenceProvider userId={user?.id ?? null}>
        {children}
      </PresenceProvider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
