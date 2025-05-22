
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdminCard from "@/components/admin/AdminCard";
import AdminUsersList from "@/components/admin/AdminUsersList";
import UserSearchForm from "@/components/admin/UserSearchForm";
import { useAdminUsers } from "@/hooks/useAdminUsers";

const AdminSettings = () => {
  const { adminUsers, isLoading, refetchAdminUsers } = useAdminUsers();

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col gap-2 mb-8">
            <h1 className="text-3xl font-bold">Admin Settings</h1>
            <p className="text-muted-foreground">
              Manage admin users and system settings
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Current Admin Users */}
            <AdminCard
              title="Current Admin Users"
              description="Users with administrative privileges"
            >
              <AdminUsersList
                adminUsers={adminUsers}
                isLoading={isLoading}
                onUserRemoved={refetchAdminUsers}
              />
            </AdminCard>

            {/* Add Admin User */}
            <AdminCard
              title="Add Admin User"
              description="Search for users by email to grant admin access"
            >
              <UserSearchForm onUserAdded={refetchAdminUsers} />
            </AdminCard>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminSettings;
