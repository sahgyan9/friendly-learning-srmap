
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { CreatePostModal } from "./CreatePostModal";
import { BecomeAMentorModal } from "./BecomeAMentorModal";

interface CreatePostButtonProps {
  onPostCreated: () => void;
}

export const CreatePostButton = ({ onPostCreated }: CreatePostButtonProps) => {
  const { user, isMentor } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBecomeAMentorModal, setShowBecomeAMentorModal] = useState(false);

  const handleCreateClick = () => {
    if (!user) {
      // This should not happen as the button is only shown to authenticated users
      return;
    }

    if (isMentor) {
      setShowCreateModal(true);
    } else {
      setShowBecomeAMentorModal(true);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Button onClick={handleCreateClick} className="flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Create Post
      </Button>

      <CreatePostModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
        onPostCreated={() => {
          onPostCreated();
          setShowCreateModal(false);
        }}
      />

      <BecomeAMentorModal
        open={showBecomeAMentorModal}
        onOpenChange={setShowBecomeAMentorModal}
      />
    </>
  );
};
