
import AdminLayout from "@/components/admin/AdminLayout";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminCard from "@/components/admin/AdminCard";
import AdminUsersList from "@/components/admin/AdminUsersList";
import UserSearchForm from "@/components/admin/UserSearchForm";
import { useAdminUsers } from "@/hooks/useAdminUsers";

const AdminSettings = () => {
  const { adminUsers, isLoading, refetchAdminUsers } = useAdminUsers();

  return (
    <AdminLayout>
      <AdminHeader
        title="Admin Settings"
        description="Manage admin users and system settings"
      />

      {/* grid-cols-1 explicitly, not just implied by omission: Tailwind's grid
          utility alone leaves columns auto-sized (content width, unbounded),
          so at the base breakpoint the wide admin-users table was setting the
          track's width instead of the track constraining the table. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
    </AdminLayout>
  );
};

export default AdminSettings;
