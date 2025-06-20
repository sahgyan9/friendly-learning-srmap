
import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Logo from "@/components/Logo";
import DarkModeToggle from "@/components/DarkModeToggle";
import NavbarProfileMenu from "@/components/NavbarProfileMenu";
import NotificationBell from "@/components/notifications/NotificationBell";
import MessagesIcon from "@/components/navbar/MessagesIcon";
import { useAuth } from "@/context/AuthContext";

const MobileTopNav = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left side - Logo or Menu */}
          <div className="flex items-center">
            {!isSearchOpen && <Logo />}
          </div>

          {/* Center - Search or Title */}
          <div className="flex-1 mx-4">
            {isSearchOpen ? (
              <div className="flex items-center">
                <Input
                  type="search"
                  placeholder="Search mentors..."
                  className="flex-1"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSearchOpen(false)}
                  className="ml-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <h1 className="text-lg font-semibold text-center">Friendly Learning</h1>
            )}
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-2">
            {!isSearchOpen && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSearchOpen(true)}
                >
                  <Search className="h-4 w-4" />
                </Button>
                
                {user && <MessagesIcon />}
                {user && <NotificationBell />}
                
                <DarkModeToggle />
                
                {user ? (
                  <NavbarProfileMenu />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMobileMenuOpen(true)}
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay for non-authenticated users */}
      {isMobileMenuOpen && !user && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 md:hidden">
          <div className="fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-900 shadow-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Menu</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4 space-y-4">
              <Link
                to="/signin"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full text-center border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-3 rounded-md font-medium"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileTopNav;
