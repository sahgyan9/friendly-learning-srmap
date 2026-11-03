import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import AdminLayout from "./AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";

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
    // Skeleton mirrors the common admin page anatomy (heading, stat row,
    // table) so the layout does not jump when data arrives.
    return (
      <AdminLayout>
        <div className="space-y-8" role="status" aria-label="Loading">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="space-y-2 rounded-xl border border-border bg-card p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
          <span className="sr-only">Loading</span>
        </div>
      </AdminLayout>
    );
  }

  return <AdminLayout>{children}</AdminLayout>;
};

export default AdminPageWrapper;
