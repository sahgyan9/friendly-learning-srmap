import { ReactNode } from "react";

interface AdminHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}

const AdminHeader = ({ title, description, action }: AdminHeaderProps) => {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">{description}</p>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
};

export default AdminHeader;
