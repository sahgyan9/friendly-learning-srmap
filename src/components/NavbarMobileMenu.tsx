
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface NavbarMobileMenuProps {
  isOpen: boolean;
  navItems: { href: string; label: string; }[];
  isActiveLink: (href: string) => boolean;
  onClose: () => void;
}

const NavbarMobileMenu = ({ isOpen, navItems, isActiveLink, onClose }: NavbarMobileMenuProps) => {
  const { user, signOut } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="md:hidden bg-white dark:bg-gray-900 border-t">
      <div className="px-2 pt-2 pb-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={onClose}
            className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
              isActiveLink(item.href)
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                : "text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
            }`}
          >
            {item.label}
          </Link>
        ))}
        
        {user ? (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link
              to="/profile"
              onClick={onClose}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
            >
              Profile
            </Link>
            <Link
              to="/messages"
              onClick={onClose}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
            >
              Messages
            </Link>
            <button
              onClick={() => {
                signOut();
                onClose();
              }}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-500"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link
              to="/signin"
              onClick={onClose}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              onClick={onClose}
              className="block px-3 py-2 rounded-md text-base font-medium bg-blue-600 text-white hover:bg-blue-700"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavbarMobileMenu;
