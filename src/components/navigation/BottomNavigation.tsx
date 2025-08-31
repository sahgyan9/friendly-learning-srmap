import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, MessageSquare, Calendar, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const BottomNavigation = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // Handle SSR
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Hide/show bottom nav on scroll
  useEffect(() => {
    if (!isMounted) return;
    
    const controlNavbar = () => {
      if (typeof window === 'undefined') return;
      
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, [lastScrollY, isMounted]);

  const navItems = [
    {
      path: "/",
      icon: Home,
      label: "Home",
      isActive: location.pathname === "/",
    },
    {
      path: "/mentors",
      icon: Users,
      label: "Mentors",
      isActive: location.pathname === "/mentors",
    },
    {
      path: "/community-posts",
      icon: MessageSquare,
      label: "Community",
      isActive: location.pathname === "/community-posts",
    },
    {
      path: "/marketplace",
      icon: Calendar,
      label: "Events",
      isActive: location.pathname === "/marketplace",
    },
    {
      path: user ? "/messages" : "/signin",
      icon: Mail,
      label: "Messages",
      isActive: location.pathname === "/messages",
      requiresAuth: true,
    },
  ];

  // Don't show on desktop or during SSR
  if (!isMounted || (typeof window !== 'undefined' && window.innerWidth >= 768)) {
    return null;
  }

  return (
    <motion.nav
      initial={{ y: 0 }}
      animate={{ y: isVisible ? 0 : 100 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-lg border-t border-border shadow-lg"
    >
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center p-2 min-w-[60px] relative transition-all duration-200 ${
                item.isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative"
              >
                <IconComponent 
                  className={`h-5 w-5 mb-1 ${
                    item.isActive ? "text-primary" : "text-muted-foreground"
                  }`} 
                />

                {/* Active indicator */}
                {item.isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                  />
                )}
              </motion.div>
              
              <span 
                className={`text-xs font-medium ${
                  item.isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default BottomNavigation;
