import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import DarkModeToggle from "@/components/DarkModeToggle";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import RoleSelectionModal from "@/components/auth/RoleSelectionModal";

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    mobile: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [pendingAuthData, setPendingAuthData] = useState<any>(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate('/');
      }
    };
    
    checkSession();
  }, [navigate]);

  // Listen for OAuth completion
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Check if this is a new user (Google OAuth signup)
          const { data: existingUser } = await supabase
            .from('users')
            .select('id, role')
            .eq('id', session.user.id)
            .single();

          if (!existingUser || !existingUser.role) {
            // New user, show role selection
            setShowRoleSelection(true);
            setPendingAuthData(session.user);
          } else {
            // Existing user, redirect to home
            navigate('/');
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleSelect = async (role: string) => {
    try {
      if (pendingAuthData) {
        // Update user role for OAuth signup
        const { error } = await supabase
          .from('users')
          .update({ role })
          .eq('id', pendingAuthData.id);

        if (error) throw error;
      }
      
      setShowRoleSelection(false);
      toast.success("Account setup completed!");
      navigate('/');
    } catch (error: any) {
      toast.error("Error setting up account: " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (!formData.mobile) {
      toast.error("Please enter your mobile number");
      return;
    }

    setIsLoading(true);
    
    try {
      // Register the user with Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            full_name: formData.name,
            mobile: formData.mobile
          },
          emailRedirectTo: `${window.location.origin}/`,
        }
      });

      if (authError) throw authError;

      // Store mobile in app users table after signup
      if (authData.user) {
        await supabase
          .from('users')
          .update({ mobile: formData.mobile })
          .eq('id', authData.user.id);
      }

      if (authData.user) {
        if (authData.session) {
          // User can log in immediately, show role selection
          setShowRoleSelection(true);
          setPendingAuthData(authData.user);
        } else {
          // Email confirmation required
          toast.success("Account created successfully! Please check your email for verification.");
          navigate('/signin');
        }
      }
    } catch (error: any) {
      console.error('Error during signup:', error);
      
      if (error.message.includes('User already registered')) {
        toast.error("An account with this email already exists. Please sign in instead.");
      } else if (error.message.includes('duplicate key')) {
        toast.error("An account with this email already exists. Please sign in instead.");
      } else {
        toast.error(error.message || "Error creating account");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="absolute top-4 right-4">
        <DarkModeToggle />
      </div>
      <div className="flex flex-grow items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="max-w-md w-full space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <Link to="/" className="block text-center text-2xl font-bold text-primary mb-2">
              <span className="mr-1">Friendly</span>
              <span className="dark:text-gray-200">Learning</span>
            </Link>
            <h2 className="mt-6 text-center text-3xl font-extrabold">
              Create your account
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Or{' '}
              <Link to="/signin" className="font-medium text-primary hover:text-primary/80">
                sign in to existing account
              </Link>
            </p>
          </div>
          
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-card text-card-foreground px-4 py-8 shadow sm:rounded-lg sm:px-10">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email-address">Email address</Label>
                  <Input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email address"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    name="mobile"
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder="Enter your mobile number"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Sign up"}
                  </Button>
                </div>
              </form>
              
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <div className="mt-6">
                  <GoogleAuthButton 
                    mode="signup" 
                    isLoading={isLoading} 
                    setIsLoading={setIsLoading} 
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <RoleSelectionModal 
        isOpen={showRoleSelection}
        onRoleSelect={handleRoleSelect}
      />
    </div>
  );
};

export default SignUp;
