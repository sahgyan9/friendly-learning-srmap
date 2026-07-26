import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { CreatePostModal } from "./CreatePostModal";

interface CreatePostButtonProps {
  onPostCreated: () => void;
  className?: string;
}

/**
 * Posting used to be gated behind "become a mentor" — which meant the students
 * actually looking for hackathon partners and study help could never post. Any
 * signed-in user can post now; signed-out users are sent to sign in and returned
 * straight back here.
 */
export const CreatePostButton = ({ onPostCreated, className }: CreatePostButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleClick = () => {
    if (!user) {
      navigate("/signin", { state: { from: location } });
      return;
    }
    setShowCreateModal(true);
  };

  return (
    <>
      <Button onClick={handleClick} className={className}>
        <Plus className="mr-2 h-4 w-4" />
        Create post
      </Button>

      <CreatePostModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onPostCreated={() => {
          onPostCreated();
          setShowCreateModal(false);
        }}
      />
    </>
  );
};

export default CreatePostButton;
