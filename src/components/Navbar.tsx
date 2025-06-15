
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Logo from "./Logo";
import { motion } from "framer-motion";
import DarkModeToggle from "./DarkModeToggle";
import NavbarProfileMenu from "./NavbarProfileMenu";
import NavbarMobileMenu from "./NavbarMobileMenu";

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

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled
        ? "py-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm"
        : "py-5 bg-transparent"
        }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
          {/* Desktop Navigation */}
          <motion.nav
            className="hidden md:flex items-center space-x-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Button variant="ghost" asChild className="text-gray-700 dark:text-gray-200 hover:text-primary">
              <Link to="/">Home</Link>
            </Button>
            <Button variant="ghost" asChild className="text-gray-700 dark:text-gray-200 hover:text-primary">
              <Link to="/about">About</Link>
            </Button>
            <Button variant="ghost" asChild className="text-gray-700 dark:text-gray-200 hover:text-primary">
              <Link to="/mentors">Mentors</Link>
            </Button>
            <Button variant="ghost" asChild className="text-gray-700 dark:text-gray-200 hover:text-primary">
              <Link to="/marketplace">MarketPlace</Link>
            </Button>
            <Button variant="ghost" asChild className="text-gray-700 dark:text-gray-200 hover:text-primary">
              <Link to="/contact">Contact</Link>
            </Button>
            <div className="ml-4 flex items-center space-x-2">
              <DarkModeToggle />
              {!loading && user ? (
                <NavbarProfileMenu />
              ) : (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button variant="default" size="sm" asChild className="flex items-center gap-1">
                    <Link to="/signin">
                      <User className="h-4 w-4" />
                      Sign In
                    </Link>
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.nav>
          {/* Mobile Navigation Toggle */}
          <div className="md:hidden flex items-center gap-2">
            <DarkModeToggle />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 dark:text-gray-200 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </motion.button>
          </div>
        </div>
        <NavbarMobileMenu
          isMobileMenuOpen={isMobileMenuOpen}
          profile={profile}
          user={user}
          loading={loading}
          signOut={signOut}
        />
      </div>
    </header>
  );
};

export default Navbar;
