
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
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
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWelcomeTour } from "@/components/onboarding/WelcomeTourContext";
import { MentorCtaTooltip } from "@/components/mentors/MentorCtaTooltip";
import { ProfileKickstartModal } from "@/components/profile/ProfileKickstartModal";
import { Sparkles, User, Award } from "lucide-react";

const NavbarProfileMenu = () => {
  const { user, profile, signOut, loading, refreshProfile } = useAuth();
  const { openTour } = useWelcomeTour();
  const [isRealMentor, setIsRealMentor] = useState(false);
  const [checkingMentorStatus, setCheckingMentorStatus] = useState(true);
  const [kickstartOpen, setKickstartOpen] = useState(false);

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
        .select('department')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking mentor status:', error);
        setIsRealMentor(false);
      } else {
        // Only consider as real mentor if not in General department and department exists
        const isApprovedMentor = data && 
          data.department && 
          data.department !== 'General' && 
          data.department.trim() !== '';
        
        setIsRealMentor(Boolean(isApprovedMentor));
      }
    } catch (error) {
      console.error('Error checking mentor status:', error);
      setIsRealMentor(false);
    } finally {
      setCheckingMentorStatus(false);
    }
  };

  if (loading || checkingMentorStatus) return null;
  if (!user) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="rounded-full p-0 h-10 w-10">
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
          
          {/* 1-Click Fast Setup / PDF Modal */}
          <DropdownMenuItem
            onClick={() => setKickstartOpen(true)}
            className="cursor-pointer text-primary focus:text-primary font-medium flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Help Others Find You
            </span>
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">10s</span>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link to={`/mentor/${user.id}`} className="cursor-pointer w-full flex items-center gap-2">
              <User className="h-4 w-4" />
              My Public Profile
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link to="/profile" className="cursor-pointer w-full">
              Account Settings
            </Link>
          </DropdownMenuItem>

          {isRealMentor && (
            <DropdownMenuItem asChild>
              <Link to="/certificate" className="cursor-pointer w-full flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                My Certificate
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={openTour} className="cursor-pointer">
            Take the tour
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-500 focus:text-red-500">
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileKickstartModal
        open={kickstartOpen}
        onOpenChange={setKickstartOpen}
        onProfileUpdated={() => {
          refreshProfile();
          checkMentorStatus();
        }}
      />
    </>
  );
};

export default NavbarProfileMenu;
