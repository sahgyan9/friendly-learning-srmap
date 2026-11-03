
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, BookOpen } from "lucide-react";

interface RoleSelectionModalProps {
  isOpen: boolean;
  onRoleSelect: (role: string) => void;
}

const RoleSelectionModal = ({ isOpen, onRoleSelect }: RoleSelectionModalProps) => {
  const [selectedRole, setSelectedRole] = useState<string>("");

  const roles = [
    {
      value: "student",
      title: "Student",
      description: "I'm here to learn and get mentorship",
      icon: GraduationCap
    },
    {
      value: "mentor",
      title: "Mentor",
      description: "I want to share knowledge and guide others",
      icon: Users
    },
    {
      value: "both",
      title: "Both",
      description: "I want to learn and mentor others",
      icon: BookOpen
    }
  ];

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose your role</DialogTitle>
          <DialogDescription>
            Pick how you will use Friendly Learning.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3" role="radiogroup" aria-label="Role">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card
                key={role.value}
                role="radio"
                aria-checked={selectedRole === role.value}
                tabIndex={0}
                className={cn(
                  "cursor-pointer shadow-none transition-colors duration-150",
                  selectedRole === role.value
                    ? "border-primary bg-primary/5"
                    : "hover:border-foreground/20 hover:bg-accent",
                )}
                onClick={() => setSelectedRole(role.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedRole(role.value);
                  }
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-5 w-5 shrink-0", selectedRole === role.value ? "text-primary" : "text-muted-foreground")} />
                    <div>
                      <CardTitle className="text-base">{role.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {role.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={() => onRoleSelect(selectedRole)}
            disabled={!selectedRole}
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoleSelectionModal;
