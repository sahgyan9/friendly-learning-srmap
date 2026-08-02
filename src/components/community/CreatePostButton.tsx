import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
 * signed-in user can post now.
 *
 * Signed-out visitors get a button that says what it will do, the same way the
 * Groups page does. It used to read "Create post" and quietly bounce you to
 * sign-in on the click — which spends someone's intent to find out a rule we
 * already knew, and reads as the page having failed rather than as a step.
 */
export const CreatePostButton = ({ onPostCreated, className }: CreatePostButtonProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);

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
