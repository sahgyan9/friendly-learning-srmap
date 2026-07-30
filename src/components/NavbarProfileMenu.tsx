
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

const NavbarProfileMenu = () => {
  const { user, profile, signOut, loading } = useAuth();
  const [isRealMentor, setIsRealMentor] = useState(false);
  const [checkingMentorStatus, setCheckingMentorStatus] = useState(true);

  useEffect(() => {
    checkMentorStatus();
  }, [user, profile]);

  const checkMentorStatus = async () => {
    if (!user) {
      setCheckingMentorStatus(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('mentors')
        .select('department')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.log('User not found in mentors table or error:', error);
        setIsRealMentor(false);
      } else {
        // Only consider as real mentor if not in General department and department exists
        const isApprovedMentor = data && 
          data.department && 
          data.department !== 'General' && 
          data.department.trim() !== '';
        
        console.log('Mentor status check:', {
          userId: user.id,
          department: data?.department,
          isApprovedMentor
        });
        
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
          {isRealMentor && (
            <DropdownMenuItem asChild>
              <Link to="/certificate" className="cursor-pointer w-full">
                My certificate
              </Link>
            </DropdownMenuItem>
          )}
          {!isRealMentor && (
            <DropdownMenuItem asChild>
              <Link to="/become-mentor" className="cursor-pointer w-full">
                Become a Mentor
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-500 focus:text-red-500">
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default NavbarProfileMenu;
