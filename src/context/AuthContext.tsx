
import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth event:", event);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user profile when session changes
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setIsMentor(false);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log("Fetching profile for user:", userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        setProfile(null);
        setIsMentor(false);
      } else if (data) {
        console.log("Profile found:", data);
        setProfile(data);
        
        // Check if user is a real mentor (not in General department)
        await checkRealMentorStatus(userId);
      } else {
        console.log("No profile found for user, this should have been created by trigger");
        setProfile(null);
        setIsMentor(false);
      }
    } catch (error) {
      console.error('Unexpected error fetching user profile:', error);
      setProfile(null);
      setIsMentor(false);
    } finally {
      setLoading(false);
    }
  };

  const checkRealMentorStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('mentors')
        .select('department')
        .eq('id', userId)
        .single();
      
      if (error) {
        setIsMentor(false);
      } else {
        // Only consider as real mentor if not in General department
        setIsMentor(data && data.department && data.department !== 'General');
      }
    } catch (error) {
      console.error('Error checking mentor status:', error);
      setIsMentor(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Navigation will be handled by the component that calls signOut
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Determine if the user is an admin
  const isAdmin = profile?.is_admin === true;

  const value = {
    session,
    user,
    profile,
    signOut,
    loading,
    isMentor,
    isAdmin,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
