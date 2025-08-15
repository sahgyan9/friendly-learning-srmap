import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import AdminLayout from "./AdminLayout";
import { Loader2 } from "lucide-react";

interface AdminPageWrapperProps {
  children: ReactNode;
  loading?: boolean;
}

/**
 * A wrapper component for admin pages that handles loading states
 * and provides consistent layout.
 * 
 * This component should be used with ProtectedRoute in App.tsx
 * to ensure proper authentication and authorization.
 */
const AdminPageWrapper = ({ children, loading = false }: AdminPageWrapperProps) => {
  const { loading: authLoading } = useAuth();
  
  const isLoading = loading || authLoading;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
};

export default AdminPageWrapper;
