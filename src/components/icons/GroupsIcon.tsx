import React from "react";
import { Drama } from "lucide-react";

/**
 * Drama / Theatre masks icon representing Clubs, Student Societies & Workspace Groups.
 */
export const GroupsIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className = "h-5 w-5",
  ...props
}) => {
  return <Drama className={className} {...(props as any)} />;
};
