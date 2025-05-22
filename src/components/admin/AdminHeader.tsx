
import { ReactNode } from "react";

interface AdminHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}

const AdminHeader = ({ title, description, action }: AdminHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};

export default AdminHeader;
