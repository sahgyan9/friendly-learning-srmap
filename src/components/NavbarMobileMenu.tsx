
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NavbarMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NavbarMobileMenu = ({ isOpen, onClose }: NavbarMobileMenuProps) => {
  const { user, profile } = useAuth();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      onClose();
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Error signing out");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="md:hidden border-t border-border bg-background">
      <div className="px-2 pt-2 pb-3 space-y-1">
        <Link
          to="/"
          className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary hover:bg-muted rounded-md"
          onClick={onClose}
        >
          Home
        </Link>
        <Link
          to="/mentors"
          className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary hover:bg-muted rounded-md"
          onClick={onClose}
        >
          Mentors
        </Link>
        <Link
          to="/community-posts"
          className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary hover:bg-muted rounded-md"
          onClick={onClose}
        >
          Community
        </Link>
        <Link
          to="/marketplace"
          className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary hover:bg-muted rounded-md"
          onClick={onClose}
        >
          Marketplace
        </Link>
        <Link
          to="/about"
          className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary hover:bg-muted rounded-md"
          onClick={onClose}
        >
          About
        </Link>
        <Link
          to="/contact"
          className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary hover:bg-muted rounded-md"
          onClick={onClose}
        >
          Contact
        </Link>
      </div>
      
      {user ? (
        <div className="pt-4 pb-3 border-t border-border">
          <div className="flex items-center px-5">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.profile_image || undefined} />
              <AvatarFallback>{profile?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <div className="text-base font-medium">{profile?.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
          <div className="mt-3 px-2 space-y-1">
            <Link
              to="/profile"
              className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary hover:bg-muted rounded-md"
              onClick={onClose}
            >
              Profile
            </Link>
            <Link
              to="/messages"
              className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary hover:bg-muted rounded-md"
              onClick={onClose}
            >
              Messages
            </Link>
            <button
              onClick={handleSignOut}
              className="block w-full text-left px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary hover:bg-muted rounded-md"
            >
              Sign Out
            </button>
          </div>
        </div>
      ) : (
        <div className="pt-4 pb-3 border-t border-border">
          <div className="px-2 space-y-1">
            <Link to="/signin" onClick={onClose}>
              <Button variant="ghost" className="w-full justify-start">
                Sign In
              </Button>
            </Link>
            <Link to="/signup" onClick={onClose}>
              <Button className="w-full justify-start">Sign Up</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
