
import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  profile_image?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  signOut: () => Promise<void>;
  loading: boolean;
  isMentor: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth event:", event);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user profile when session changes
        if (session?.user) {
          // For Google Auth or other OAuth providers, we need to create a profile if it doesn't exist
          if (event === 'SIGNED_IN') {
            setTimeout(() => {
              checkAndCreateUserProfile(session.user);
            }, 0);
          } else {
            setTimeout(() => {
              fetchUserProfile(session.user.id);
            }, 0);
          }
        } else {
          setProfile(null);
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

  const checkAndCreateUserProfile = async (user: User) => {
    try {
      setLoading(true);
      // First check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (fetchError) throw fetchError;

      // If profile doesn't exist, create one
      if (!existingProfile) {
        const name = user.user_metadata.full_name || 
                     user.user_metadata.name || 
                     user.user_metadata.email?.split('@')[0] || 
                     'User';
        
        const userData = {
          id: user.id,
          name: name,
          email: user.email || '',
          role: 'student' // Default role
        };

        const { error: insertError } = await supabase
          .from('users')
          .insert(userData);
        
        if (insertError) throw insertError;
        
        setProfile(userData);
        toast.success("Welcome! Your profile has been created.");
      } else {
        setProfile(existingProfile);
      }
    } catch (error) {
      console.error('Error checking/creating user profile:', error);
      toast.error("Failed to load your profile. Please try refreshing the page.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        setProfile(null);
        toast.error("Failed to load your profile data");
      } else {
        setProfile(data);
        console.log("Profile data loaded:", data);
        
        // After fetching basic profile, check if the user is a mentor
        if (data) {
          checkMentorStatus(userId);
        }
      }
    } catch (error) {
      console.error('Unexpected error fetching user profile:', error);
      setProfile(null);
      toast.error("An error occurred while loading your profile");
    } finally {
      setLoading(false);
    }
  };

  const checkMentorStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('mentors')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" which is expected if user is not a mentor
        console.error('Error checking mentor status:', error);
      } 
      
      if (data) {
        // Update user role to mentor if they are in the mentors table
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: 'mentor' })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Error updating user role:', updateError);
        } else {
          // Refresh profile to get updated role
          fetchUserProfile(userId);
        }
      }
    } catch (error) {
      console.error('Error in mentor status check:', error);
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
      navigate('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Determine if the user is a mentor
  const isMentor = profile?.role === 'mentor';

  const value = {
    session,
    user,
    profile,
    signOut,
    loading,
    isMentor,
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
