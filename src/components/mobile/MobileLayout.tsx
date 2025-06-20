
import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import Navbar from "@/components/Navbar";
import MobileTopNav from "./MobileTopNav";
import MobileBottomNav from "./MobileBottomNav";

interface MobileLayoutProps {
  children: ReactNode;
  showNavbar?: boolean;
}

const MobileLayout = ({ children, showNavbar = true }: MobileLayoutProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {showNavbar && <MobileTopNav />}
        
        <main className={`${showNavbar ? 'pt-16 pb-20' : 'pt-0 pb-20'}`}>
          {children}
        </main>
        
        <MobileBottomNav />
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-background text-foreground">
      {showNavbar && <Navbar />}
      {children}
    </div>
  );
};

export default MobileLayout;
