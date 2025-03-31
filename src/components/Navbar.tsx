
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, User, MessageCircle, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile, signOut, loading } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "py-3 bg-white/90 backdrop-blur-md shadow-sm"
          : "py-5 bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="text-xl md:text-2xl font-bold text-primary tracking-tight flex items-center"
          >
            <span className="mr-1">Friendly</span>
            <span className="text-gray-700">Learning</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Button variant="ghost" asChild className="text-gray-700 hover:text-primary">
              <Link to="/">Home</Link>
            </Button>
            <Button variant="ghost" asChild className="text-gray-700 hover:text-primary">
              <Link to="/about">About</Link>
            </Button>
            <Button variant="ghost" asChild className="text-gray-700 hover:text-primary">
              <Link to="/mentors">Mentors</Link>
            </Button>
            <Button variant="ghost" asChild className="text-gray-700 hover:text-primary">
              <Link to="/contact">Contact</Link>
            </Button>

            <div className="ml-4 flex items-center space-x-2">
              {!loading && user ? (
                <>
                  <Button variant="outline" size="sm" asChild className="flex items-center gap-1">
                    <Link to="/messages">
                      <MessageCircle className="h-4 w-4" />
                      Messages
                    </Link>
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="rounded-full p-0 h-10 w-10">
                        <Avatar>
                          <AvatarImage src={profile?.profile_image} />
                          <AvatarFallback>{profile?.name ? getInitials(profile.name) : 'U'}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        {profile?.name || 'My Account'}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="cursor-pointer w-full">
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      {profile?.role !== 'mentor' && (
                        <DropdownMenuItem asChild>
                          <Link to="/become-mentor" className="cursor-pointer w-full">
                            Become a Mentor
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link to="/messages" className="cursor-pointer w-full">
                          Messages
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-500 focus:text-red-500">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button variant="default" size="sm" asChild className="flex items-center gap-1">
                  <Link to="/signin">
                    <User className="h-4 w-4" />
                    Sign In
                  </Link>
                </Button>
              )}
            </div>
          </nav>

          {/* Mobile Navigation Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-gray-700 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <nav className="md:hidden mt-4 py-4 px-2 bg-white/95 backdrop-blur-md rounded-lg shadow-lg animate-fade-in">
            <div className="flex flex-col space-y-3">
              <Button variant="ghost" asChild className="justify-start text-gray-700 hover:text-primary">
                <Link to="/">Home</Link>
              </Button>
              <Button variant="ghost" asChild className="justify-start text-gray-700 hover:text-primary">
                <Link to="/about">About</Link>
              </Button>
              <Button variant="ghost" asChild className="justify-start text-gray-700 hover:text-primary">
                <Link to="/mentors">Mentors</Link>
              </Button>
              <Button variant="ghost" asChild className="justify-start text-gray-700 hover:text-primary">
                <Link to="/contact">Contact</Link>
              </Button>
              
              <div className="pt-2 flex flex-col space-y-2">
                {!loading && user ? (
                  <>
                    <div className="flex items-center p-2 rounded-md bg-gray-50">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarImage src={profile?.profile_image} />
                        <AvatarFallback>{profile?.name ? getInitials(profile.name) : 'U'}</AvatarFallback>
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
          </nav>
        )}
      </div>
    </header>
  );
};

export default Navbar;
