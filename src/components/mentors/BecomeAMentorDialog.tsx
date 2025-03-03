
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import BecomeAMentorForm from "./BecomeAMentorForm";
import { useState } from "react";

const BecomeAMentorDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Become a Mentor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Become a Mentor</DialogTitle>
        </DialogHeader>
        <BecomeAMentorForm onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};

export default BecomeAMentorDialog;
