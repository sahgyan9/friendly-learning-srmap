
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, User, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

            <div className="ml-4 flex space-x-2">
              <Button variant="outline" size="sm" asChild className="flex items-center gap-1">
                <Link to="/messages">
                  <MessageCircle className="h-4 w-4" />
                  Messages
                </Link>
              </Button>
              <Button variant="default" size="sm" asChild className="flex items-center gap-1">
                <Link to="/signin">
                  <User className="h-4 w-4" />
                  Sign In
                </Link>
              </Button>
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
                <Button variant="outline" size="sm" asChild className="flex items-center gap-1 justify-center">
                  <Link to="/messages">
                    <MessageCircle className="h-4 w-4" />
                    Messages
                  </Link>
                </Button>
                <Button variant="default" size="sm" asChild className="flex items-center gap-1 justify-center">
                  <Link to="/signin">
                    <User className="h-4 w-4" />
                    Sign In
                  </Link>
                </Button>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Navbar;
