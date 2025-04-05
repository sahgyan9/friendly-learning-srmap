import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, LogOut, MessageSquare, UserPlus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Navbar = () => {
  const { user, profile, loading, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <motion.nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled ? "bg-background/80 backdrop-blur-md border-b" : "bg-transparent"
      )}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0"
          >
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Friendly Learning
              </span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/mentors"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Find Mentors
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/about"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                About Us
              </Link>
            </motion.div>
          </div>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex md:items-center md:gap-4">
            {!loading && user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.profile_image} />
                        <AvatarFallback>
                          {profile?.name ? getInitials(profile.name) : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      {profile?.name || "My Account"}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer w-full">
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/messages" className="cursor-pointer w-full">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Messages
                      </Link>
                    </DropdownMenuItem>
                    {profile?.role !== "mentor" && (
                      <DropdownMenuItem asChild>
                        <Link to="/become-mentor" className="cursor-pointer w-full">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Become a Mentor
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={signOut}
                      className="cursor-pointer text-red-500 focus:text-red-500"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button variant="default" size="sm" asChild>
                  <Link to="/signin" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Sign In
                  </Link>
                </Button>
              </motion.div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col h-full">
                  {/* Mobile User Profile */}
                  {!loading && user && (
                    <div className="flex items-center p-2 mb-4 rounded-md bg-muted/50">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarImage src={profile?.profile_image} />
                        <AvatarFallback>
                          {profile?.name ? getInitials(profile.name) : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{profile?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {profile?.email}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Mobile Navigation Links */}
                  <div className="space-y-3">
                    <Link
                      to="/mentors"
                      className="flex items-center gap-2 p-2 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                    >
                      Find Mentors
                    </Link>
                    <Link
                      to="/about"
                      className="flex items-center gap-2 p-2 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                    >
                      About Us
                    </Link>
                  </div>

                  {/* Mobile Auth Links */}
                  {!loading && (
                    <div className="mt-auto space-y-3">
                      {user ? (
                        <>
                          <Link
                            to="/profile"
                            className="flex items-center gap-2 p-2 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                          >
                            <User className="h-4 w-4" />
                            Profile
                          </Link>
                          <Link
                            to="/messages"
                            className="flex items-center gap-2 p-2 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                          >
                            <MessageSquare className="h-4 w-4" />
                            Messages
                          </Link>
                          {profile?.role !== "mentor" && (
                            <Link
                              to="/become-mentor"
                              className="flex items-center gap-2 p-2 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                            >
                              <UserPlus className="h-4 w-4" />
                              Become a Mentor
                            </Link>
                          )}
                          <button
                            onClick={signOut}
                            className="flex items-center gap-2 w-full p-2 text-sm font-medium text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            Sign out
                          </button>
                        </>
                      ) : (
                        <Button asChild className="w-full">
                          <Link to="/signin" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Sign In
                          </Link>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
