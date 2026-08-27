import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Award,
  Compass,
  LogOut,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
} from "lucide-react";
import { AttendanceIcon } from "@/components/icons/AttendanceIcon";
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
import { getInitials } from "@/utils/user-utils";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWelcomeTour } from "@/components/onboarding/WelcomeTourContext";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NavbarProfileMenu = () => {
  const { user, profile, signOut, loading, isAdmin } = useAuth();
  const { openTour } = useWelcomeTour();
  const { isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [isRealMentor, setIsRealMentor] = useState(false);
  const [mentorSlug, setMentorSlug] = useState<string | null>(null);
  const [checkingMentorStatus, setCheckingMentorStatus] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHighlightingInstall, setIsHighlightingInstall] = useState(false);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleHighlight = () => {
      setMenuOpen(true);
      setIsHighlightingInstall(true);

      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }

      autoCloseTimerRef.current = setTimeout(() => {
        setIsHighlightingInstall(false);
        setMenuOpen(false);
      }, 4500);
    };

    window.addEventListener("fl:highlight-pwa-install", handleHighlight);
    return () => {
      window.removeEventListener("fl:highlight-pwa-install", handleHighlight);
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    checkMentorStatus();
  }, [user, profile]);

  const checkMentorStatus = async () => {
    if (!user) {
      setCheckingMentorStatus(false);
      return;
    }
    
    try {
      // maybeSingle, not single: a student simply has no mentors row, and
      // single() turns that ordinary case into a 406 plus a console error on
      // every page load — noise that buries real failures in the API log.
      const { data, error } = await supabase
        .from('mentors')
        .select('department, slug')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking mentor status:', error);
        setIsRealMentor(false);
        setMentorSlug(null);
      } else {
        // Only consider as real mentor if not in General department and department exists
        const isApprovedMentor = data && 
          data.department && 
          data.department !== 'General' && 
          data.department.trim() !== '';
        
        setIsRealMentor(Boolean(isApprovedMentor));
        setMentorSlug(data?.slug || null);
      }
    } catch (error) {
      console.error('Error checking mentor status:', error);
      setIsRealMentor(false);
      setMentorSlug(null);
    } finally {
      setCheckingMentorStatus(false);
    }
  };

  if (loading || checkingMentorStatus) return null;
  if (!user) return null;

  return (
    <>
      <DropdownMenu
        open={menuOpen}
        onOpenChange={(next) => {
          setMenuOpen(next);
          if (!next) {
            setIsHighlightingInstall(false);
            if (autoCloseTimerRef.current) {
              clearTimeout(autoCloseTimerRef.current);
            }
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-full p-0 h-10 w-10 transition-all duration-300",
              isHighlightingInstall && "ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse"
            )}
          >
            <Avatar>
              <AvatarImage src={profile?.profile_image} />
              <AvatarFallback>{getInitials(profile?.name)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>
            <div className="font-semibold text-sm truncate">{profile?.name || 'My Account'}</div>
            <div className="text-[11px] text-muted-foreground font-normal truncate">{user.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* 1-Click Fast Setup — goes straight to the Profile Studio, no popup */}
          {isRealMentor ? (
            <DropdownMenuItem asChild>
              <Link to={`/mentor/${mentorSlug || user.id}`} className="cursor-pointer w-full flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>My Public Profile</span>
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              asChild
              className="cursor-pointer text-primary focus:text-primary font-medium flex items-center justify-between"
            >
              <Link to="/profile/setup" className="flex w-full items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Set Up Public Profile</span>
                </span>
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">10s</span>
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem asChild>
            <Link to="/attendance" className="cursor-pointer w-full flex items-center gap-2">
              <AttendanceIcon className="h-4 w-4 text-primary" />
              <span>Attendance</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link to="/profile" className="cursor-pointer w-full flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>Account Settings</span>
            </Link>
          </DropdownMenuItem>

          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link to="/admin" className="cursor-pointer w-full flex items-center gap-2 text-violet-600 dark:text-violet-400 focus:text-violet-600">
                <ShieldCheck className="h-4 w-4" />
                <span>Admin Dashboard</span>
              </Link>
            </DropdownMenuItem>
          )}

          {isRealMentor && (
            <DropdownMenuItem asChild>
              <Link to="/certificate" className="cursor-pointer w-full flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                <span>My Certificate</span>
              </Link>
            </DropdownMenuItem>
          )}

          {!isInstalled && (
            <DropdownMenuItem
              onClick={async () => {
                setIsHighlightingInstall(false);
                setMenuOpen(false);
                if (isIOS) {
                  toast.info("On iPhone/iPad: Tap Safari's Share button (⎋) → 'Add to Home Screen'");
                } else {
                  const accepted = await promptInstall();
                  if (accepted) {
                    toast.success("App installed!");
                  } else {
                    toast.info("Look for the install icon (⊕) in your browser address bar or menu (⋮) → 'Install Friendly Learning'");
                  }
                }
              }}
              className={cn(
                "cursor-pointer text-primary focus:text-primary font-medium flex items-center justify-between transition-all duration-300",
                isHighlightingInstall &&
                  "bg-primary/15 ring-1 ring-primary/40 font-semibold rounded-md animate-pulse"
              )}
            >
              <span className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <span>Install Friendly Learning</span>
              </span>
              {isHighlightingInstall && (
                <span className="text-[10px] bg-primary text-primary-foreground font-semibold px-1.5 py-0.5 rounded-full shadow-xs">
                  Here!
                </span>
              )}
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={openTour} className="cursor-pointer flex items-center gap-2">
            <Compass className="h-4 w-4" />
            <span>Take the tour</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-500 focus:text-red-500 flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default NavbarProfileMenu;
