import { Users } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CommunityMemberList } from "@/components/communities/CommunityMemberList";
import { type CommunityVisibility } from "@/integrations/supabase/services/communities";

interface CommunityMemberDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  communityName: string;
  isOwner: boolean;
  visibility?: CommunityVisibility;
  onChanged: () => void;
}

export function CommunityMemberDrawer({
  open,
  onOpenChange,
  communityId,
  communityName,
  isOwner,
  visibility = "public",
  onChanged,
}: CommunityMemberDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto">
        <SheetHeader className="p-6 pb-2 border-b">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            {communityName} Members
          </SheetTitle>
          <SheetDescription>
            {isOwner
              ? "Manage community members, roles, and invitations."
              : "Students and mentors currently participating in this workspace."}
          </SheetDescription>
        </SheetHeader>

        <div className="p-4">
          <CommunityMemberList
            communityId={communityId}
            isOwner={isOwner}
            visibility={visibility}
            onChanged={onChanged}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default CommunityMemberDrawer;
