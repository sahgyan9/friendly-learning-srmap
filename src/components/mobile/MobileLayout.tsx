
import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileTopNav from "./MobileTopNav";
import MobileBottomNav from "./MobileBottomNav";
import Navbar from "@/components/Navbar";

interface MobileLayoutProps {
  children: ReactNode;
}

const MobileLayout = ({ children }: MobileLayoutProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <MobileTopNav />
        <main className="pt-16 pb-20">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      {children}
    </div>
  );
};

export default MobileLayout;
