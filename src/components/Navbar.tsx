import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      navigate('/sign-in');
    } catch (error) {
      console.error("Sign out failed:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="fixed top-0 left-0 w-full bg-background z-50 shadow-sm">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="text-2xl font-bold">
          MentorVerse
        </Link>
        <nav className="flex items-center">
          <Link
            to="/mentors"
            className="mr-4 px-3 py-2 rounded hover:bg-primary/10 transition"
          >
            Find Mentors
          </Link>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative w-8 h-8 rounded-full mr-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.profile_image} alt={user.name} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/messages')}>Messages</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link
                to="/sign-in"
                className="mr-2 px-3 py-2 rounded hover:bg-primary/10 transition"
              >
                Sign In
              </Link>
              <Link
                to="/sign-up"
                className="px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition"
              >
                Sign Up
              </Link>
            </>
          )}
          <Link
            to="/ai-chat"
            className="ml-2 px-3 py-2 rounded hover:bg-primary/10 transition text-primary font-medium"
          >
            AI Chat
          </Link>
        </nav>
      </div>
    </div>
  );
};

export default Navbar;
