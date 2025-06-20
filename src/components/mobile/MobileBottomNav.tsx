
import { Link, useLocation } from "react-router-dom";
import { Home, Info, Users, ShoppingBag, Phone } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const MobileBottomNav = () => {
  const location = useLocation();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/about", label: "About", icon: Info },
    { href: "/mentors", label: "Mentors", icon: Users },
    { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
    { href: "/contact", label: "Contact", icon: Phone },
  ];

  const isActiveLink = (href: string) => {
    if (href === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50 pb-safe">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActiveLink(item.href);
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 min-w-0 flex-1 transition-colors ${
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              <Icon 
                className={`h-5 w-5 mb-1 ${
                  isActive ? "text-blue-600 dark:text-blue-400" : ""
                }`} 
              />
              <span 
                className={`text-xs font-medium truncate ${
                  isActive ? "text-blue-600 dark:text-blue-400" : ""
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
