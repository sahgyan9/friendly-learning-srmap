
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { getInitials } from "@/utils/user-utils";

interface NavbarMobileMenuProps {
  isMobileMenuOpen: boolean;
  profile: any;
  user: any;
  loading: boolean;
  signOut: () => void;
}

const NavbarMobileMenu = ({
  isMobileMenuOpen,
  profile,
  user,
  loading,
  signOut,
}: NavbarMobileMenuProps) => {
  if (!isMobileMenuOpen) return null;

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="md:hidden mt-4 py-4 px-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-lg shadow-lg"
    >
      <div className="flex flex-col space-y-3">
        <Button variant="ghost" asChild className="justify-start text-gray-700 dark:text-gray-200 hover:text-primary">
          <Link to="/">Home</Link>
        </Button>
        <Button variant="ghost" asChild className="justify-start text-gray-700 dark:text-gray-200 hover:text-primary">
          <Link to="/about">About</Link>
        </Button>
        <Button variant="ghost" asChild className="justify-start text-gray-700 dark:text-gray-200 hover:text-primary">
          <Link to="/mentors">Mentors</Link>
        </Button>
        <Button variant="ghost" asChild className="justify-start text-gray-700 dark:text-gray-200 hover:text-primary">
          <Link to="/marketplace">MarketPlace</Link>
        </Button>
        <Button variant="ghost" asChild className="justify-start text-gray-700 dark:text-gray-200 hover:text-primary">
          <Link to="/contact">Contact</Link>
        </Button>

        <div className="pt-2 flex flex-col space-y-2">
          {!loading && user ? (
            <>
              <div className="flex items-center p-2 rounded-md bg-gray-50">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={profile?.profile_image} />
                  <AvatarFallback>{getInitials(profile?.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{profile?.name}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild className="justify-center">
                <Link to="/profile">My Profile</Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="justify-center">
                <Link to="/messages">Messages</Link>
              </Button>
              {profile?.role !== 'mentor' && (
                <Button variant="outline" size="sm" asChild className="justify-center">
                  <Link to="/become-mentor">Become a Mentor</Link>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="justify-center text-red-500 border-red-200 hover:bg-red-50"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </>
          ) : (
            <Button variant="default" size="sm" asChild className="justify-center">
              <Link to="/signin">
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Link>
            </Button>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default NavbarMobileMenu;
