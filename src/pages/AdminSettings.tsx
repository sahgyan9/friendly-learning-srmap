
import AdminLayout from "@/components/admin/AdminLayout";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminCard from "@/components/admin/AdminCard";
import AdminUsersList from "@/components/admin/AdminUsersList";
import UserSearchForm from "@/components/admin/UserSearchForm";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BrainCircuit } from "lucide-react";

const AdminSettings = () => {
  const { adminUsers, isLoading, refetchAdminUsers } = useAdminUsers();
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);
  const [isAiSettingLoading, setIsAiSettingLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('platform_settings' as any)
        .select('value')
        .eq('id', 'ai_overview_enabled')
        .single();
      
      if (data) {
        // Value is stored as JSONB, e.g. 'true' or 'false'
        const rawValue = (data as any).value;
        setAiEnabled(rawValue === 'true' || rawValue === true);
      }
      setIsAiSettingLoading(false);
    };
    fetchSettings();
  }, []);

  const toggleAiOverview = async (checked: boolean) => {
    setAiEnabled(checked);
    const { error } = await supabase
      .from('platform_settings' as any)
      .update({ value: checked })
      .eq('id', 'ai_overview_enabled');

    if (error) {
      toast.error("Failed to update AI setting");
      setAiEnabled(!checked);
    } else {
      toast.success(`AI Overview ${checked ? 'enabled' : 'disabled'}`);
    }
  };

  return (
    <AdminLayout>
      <AdminHeader
        title="Admin Settings"
        description="Manage admin users and system settings"
      />

      {/* Feature Toggles Section */}
      <div className="mb-6">
        <AdminCard
          title="Feature Toggles"
          description="Enable or disable global platform features"
        >
          <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center space-x-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <BrainCircuit className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="ai-toggle" className="text-base">AI Campus Overview</Label>
                <p className="text-sm text-muted-foreground">
                  Allow students to search the campus using the AI assistant.
                </p>
              </div>
            </div>
            <Switch
              id="ai-toggle"
              checked={aiEnabled}
              onCheckedChange={toggleAiOverview}
              disabled={isAiSettingLoading}
            />
          </div>
        </AdminCard>
      </div>

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
