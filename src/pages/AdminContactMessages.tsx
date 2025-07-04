
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import AdminLayout from "@/components/admin/AdminLayout";
import ContactMessagesAdmin from "@/components/admin/ContactMessagesAdmin";

const AdminContactMessages = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container px-4 md:px-6">
          <AdminLayout>
            <ContactMessagesAdmin />
          </AdminLayout>
        </div>
      </main>
    </div>
  );
};

export default AdminContactMessages;
