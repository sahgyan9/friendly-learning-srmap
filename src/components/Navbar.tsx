
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";
import NavbarProfileMenu from "./NavbarProfileMenu";
import { NavbarMobileMenu } from "./NavbarMobileMenu";
import MessagesIcon from "./navbar/MessagesIcon";
import NotificationBell from "./notifications/NotificationBell";

const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <Logo />
          </Link>

          {/* Desktop Navigation - hidden since tubelight navbar handles desktop nav */}
          <div className="hidden items-center space-x-8">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/") ? "text-primary" : "text-muted-foreground"
                }`}
            >
              Home
            </Link>
            <Link
              to="/mentors"
              className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/mentors") ? "text-primary" : "text-muted-foreground"
                }`}
            >
              Mentors
            </Link>
            <Link
              to="/community-posts"
              className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/community-posts") ? "text-primary" : "text-muted-foreground"
                }`}
            >
              Community
            </Link>
            <Link
              to="/marketplace"
              className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/marketplace") ? "text-primary" : "text-muted-foreground"
                }`}
            >
              {/* Changed label from 'Marketplace' to 'Events' for frontend only. Backend and route remain 'marketplace'. */}
              Events
            </Link>
            <Link
              to="/about"
              className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/about") ? "text-primary" : "text-muted-foreground"
                }`}
            >
              About
            </Link>
            <Link
              to="/contact"
              className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/contact") ? "text-primary" : "text-muted-foreground"
                }`}
            >
              Contact
            </Link>
          </div>

          {/* Right side - Auth buttons or user menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <MessagesIcon />
                <NotificationBell />
                <NavbarProfileMenu />
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/signin">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            {user && (
              <>
                <MessagesIcon />
                <NotificationBell />
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <NavbarMobileMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      </div>
    </nav>
  );
};

export default Navbar;
