
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      icon: GraduationCap,
      // Card supplies text-card-foreground, which is near-white in dark mode —
      // without a dark tint these cards kept their near-white background and
      // the label disappeared into it.
      color:
        "bg-blue-50 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/50 dark:border-blue-900 dark:hover:bg-blue-900/50"
    },
    {
      value: "mentor",
      title: "Mentor",
      description: "I want to share knowledge and guide others",
      icon: Users,
      color:
        "bg-green-50 border-green-200 hover:bg-green-100 dark:bg-green-950/50 dark:border-green-900 dark:hover:bg-green-900/50"
    },
    {
      value: "both",
      title: "Both",
      description: "I want to learn and mentor others",
      icon: BookOpen,
      color:
        "bg-purple-50 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/50 dark:border-purple-900 dark:hover:bg-purple-900/50"
    }
  ];

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Your Role</DialogTitle>
          <DialogDescription>
            Select how you'd like to use Friendly Learning platform
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card
                key={role.value}
                className={`cursor-pointer transition-all ${role.color} ${
                  selectedRole === role.value ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => setSelectedRole(role.value)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <Icon className="h-6 w-6" />
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
