
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import ContactMessagesAdmin from "@/components/admin/ContactMessagesAdmin";
import { Loader2 } from "lucide-react";

const AdminContactMessages = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" role="status">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <AdminLayout>
      <ContactMessagesAdmin />
    </AdminLayout>
  );
};

export default AdminContactMessages;
