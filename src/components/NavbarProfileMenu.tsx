
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, GraduationCap } from "lucide-react";
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
import { ImportSrmPortalDialog } from "@/components/profile/ImportSrmPortal";
import { MentorCtaTooltip } from "@/components/mentors/MentorCtaTooltip";

const NavbarProfileMenu = () => {
  const { user, profile, signOut, loading } = useAuth();
  const { openTour } = useWelcomeTour();
  const [isRealMentor, setIsRealMentor] = useState(false);
  const [checkingMentorStatus, setCheckingMentorStatus] = useState(true);
  const [srmImportOpen, setSrmImportOpen] = useState(false);

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
        
        
        setIsRealMentor(isApprovedMentor);
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
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            {profile?.name || 'My Account'}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/profile" className="cursor-pointer w-full">
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSrmImportOpen(true)} className="cursor-pointer">
            <GraduationCap className="h-4 w-4 mr-2" />
            Import from SRM portal
          </DropdownMenuItem>
          {isRealMentor && (
            <DropdownMenuItem asChild>
              <Link to="/certificate" className="cursor-pointer w-full">
                My certificate
              </Link>
            </DropdownMenuItem>
          )}
          {!isRealMentor && (
            <MentorCtaTooltip side="left">
              <DropdownMenuItem asChild>
                <Link to="/become-mentor" className="cursor-pointer w-full">
                  Become a Mentor
                </Link>
              </DropdownMenuItem>
            </MentorCtaTooltip>
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

      <ImportSrmPortalDialog
        open={srmImportOpen}
        onOpenChange={setSrmImportOpen}
      />
    </>
  );
};

export default NavbarProfileMenu;
