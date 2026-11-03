import { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AdminCardProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const AdminCard = ({ title, description, children, footer, className }: AdminCardProps) => {
  return (
    // min-w-0: without it, a wide child (the admin-users table, sized by
    // its own nowrap "Remove Admin" button) sets this card's min-content
    // width, and a CSS grid track sizes to that instead of the column's
    // share of the row — which is what pushed AdminSettings' two-card
    // grid past a 360px viewport.
    <Card className={cn("min-w-0 animate-fade-up shadow-card", className)}>
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">{children}</CardContent>
      {footer && <CardFooter className="border-t border-border pt-4">{footer}</CardFooter>}
    </Card>
  );
};

export default AdminCard;
