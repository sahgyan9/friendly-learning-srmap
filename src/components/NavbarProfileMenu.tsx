
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, LogOut } from "lucide-react";
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

const NavbarProfileMenu = () => {
  const { user, profile, signOut, loading } = useAuth();

  if (loading) return null;
  if (!user) return null;

  return (
    <>
      <Button variant="outline" size="sm" asChild className="flex items-center gap-1">
        <Link to="/messages">
          <MessageCircle className="h-4 w-4" />
          Messages
        </Link>
      </Button>
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
          {profile?.role !== 'mentor' && (
            <DropdownMenuItem asChild>
              <Link to="/become-mentor" className="cursor-pointer w-full">
                Become a Mentor
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link to="/messages" className="cursor-pointer w-full">
              Messages
            </Link>
          </DropdownMenuItem>
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
