import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { CreatePostModal } from "./CreatePostModal";

interface CreatePostButtonProps {
  onPostCreated: () => void;
  className?: string;
  /**
   * Wording for the signed-in button. The signed-out button is deliberately not
   * configurable — it has to say that signing in is what happens next.
   */
  label?: string;
  initialPostType?: string;
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CreatePostButton = ({
  onPostCreated,
  className,
  label = "Create post",
  initialPostType,
  initialTitle,
  initialContent,
  initialTags,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: CreatePostButtonProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const showCreateModal = isControlled ? controlledOpen : internalOpen;
  const setShowCreateModal = (open: boolean) => {
    if (isControlled && setControlledOpen) {
      setControlledOpen(open);
    } else {
      setInternalOpen(open);
    }
  };

  if (!user) {
    return (
      <Button asChild variant="outline" className={className}>
        {/* `from` is what sends them back to the board afterwards instead of
            dropping them on the homepage. */}
        <Link to="/signin" state={{ from: location }}>
          Sign in to post
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setShowCreateModal(true)} className={className}>
        <Plus className="mr-2 h-4 w-4" />
        {label}
      </Button>

      <CreatePostModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        initialPostType={initialPostType}
        initialTitle={initialTitle}
        initialContent={initialContent}
        initialTags={initialTags}
        onPostCreated={() => {
          onPostCreated();
          setShowCreateModal(false);
        }}
      />
    </>
  );
};

export default CreatePostButton;
