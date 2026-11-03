
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BrainCircuit, HeartPulse, Plus, Trash2, Save } from "lucide-react";

type CounsellorEntry = {
  name: string;
  email: string;
};

const AdminSettings = () => {
  const { adminUsers, isLoading, refetchAdminUsers } = useAdminUsers();
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);
  const [isAiSettingLoading, setIsAiSettingLoading] = useState(true);

  // Well-being settings
  const [counsellors, setCounsellors] = useState<CounsellorEntry[]>([]);
  const [adminPhone, setAdminPhone] = useState("");
  const [adminLabel, setAdminLabel] = useState("");
  const [isWellbeingLoading, setIsWellbeingLoading] = useState(true);
  const [savingWellbeing, setSavingWellbeing] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('id', 'ai_overview_enabled')
        .single();
      
      if (data) {
        // Value is stored as JSONB, e.g. 'true' or 'false'
        const rawValue = (data as { value: unknown }).value;
        setAiEnabled(rawValue === 'true' || rawValue === true);
      }
      setIsAiSettingLoading(false);
    };

    const fetchWellbeingSettings = async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('id, value')
        .in('id', ['wellbeing_counsellors', 'wellbeing_admin_phone', 'wellbeing_admin_label']);

      if (!error && data) {
        for (const item of data) {
          if (item.id === 'wellbeing_counsellors' && item.value) {
            try {
              const parsed = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
              if (Array.isArray(parsed)) {
                setCounsellors(parsed);
              }
            } catch (e) {
              console.error("Failed to parse counsellors:", e);
            }
          } else if (item.id === 'wellbeing_admin_phone' && item.value) {
            setAdminPhone(typeof item.value === 'string' ? item.value.replace(/^"|"$/g, '') : String(item.value));
          } else if (item.id === 'wellbeing_admin_label' && item.value) {
            setAdminLabel(typeof item.value === 'string' ? item.value.replace(/^"|"$/g, '') : String(item.value));
          }
        }
      }
      setIsWellbeingLoading(false);
    };

    fetchSettings();
    fetchWellbeingSettings();
  }, []);

  const toggleAiOverview = async (checked: boolean) => {
    setAiEnabled(checked);
    const { error } = await supabase
      .from('platform_settings')
      .update({ value: checked })
      .eq('id', 'ai_overview_enabled');

    if (error) {
      toast.error("Failed to update AI setting");
      setAiEnabled(!checked);
    } else {
      toast.success(`AI Overview ${checked ? 'enabled' : 'disabled'}`);
    }
  };

  const handleAddCounsellor = () => {
    setCounsellors((prev) => [...prev, { name: "", email: "" }]);
  };

  const handleRemoveCounsellor = (index: number) => {
    setCounsellors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCounsellorChange = (index: number, field: "name" | "email", val: string) => {
    setCounsellors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: val } : c))
    );
  };

  const handleSaveWellbeingSettings = async () => {
    setSavingWellbeing(true);
    try {
      const validCounsellors = counsellors.filter(
        (c) => c.name.trim().length > 0 && c.email.trim().length > 0
      );

      const updates = [
        supabase
          .from('platform_settings')
          .update({ value: validCounsellors.length > 0 ? validCounsellors : null })
          .eq('id', 'wellbeing_counsellors'),
        supabase
          .from('platform_settings')
          .update({ value: adminPhone.trim() ? adminPhone.trim() : null })
          .eq('id', 'wellbeing_admin_phone'),
        supabase
          .from('platform_settings')
          .update({ value: adminLabel.trim() ? adminLabel.trim() : null })
          .eq('id', 'wellbeing_admin_label'),
      ];

      const results = await Promise.all(updates);
      const hasError = results.some((r) => r.error);

      if (hasError) {
        toast.error("Failed to update some well-being settings");
      } else {
        toast.success("Well-being contacts saved to platform settings");
      }
    } catch (err) {
      console.error("Error saving wellbeing settings:", err);
      toast.error("Failed to save settings");
    } finally {
      setSavingWellbeing(false);
    }
  };

  return (
    <AdminLayout>
      <AdminHeader
        title="Settings"
        description="Platform feature toggles and who has admin access."
      />

      {/* Feature Toggles Section */}
      <div className="mb-6">
        <AdminCard
          title="Feature toggles"
          description="Turn platform-wide features on or off."
        >
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-secondary/50">
            <div className="flex items-center space-x-3">
              <div className="bg-secondary p-2 rounded-lg">
                <BrainCircuit className="h-5 w-5 text-muted-foreground" />
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

      {/* Well-being & Safety Contacts Section */}
      <div className="mb-6">
        <AdminCard
          title="Well-being & Safety Contacts"
          description="Manage counsellors and admin contact details shown on well-being help cards. Blank entries are hidden from students automatically."
        >
          <div className="space-y-6">
            {/* Counsellor list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">University Counsellors</h4>
                  <p className="text-xs text-muted-foreground">
                    Shown with confidential pre-drafted email buttons.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCounsellor}
                  className="text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Counsellor
                </Button>
              </div>

              {counsellors.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  No counsellors configured. The counsellor section on the help card is currently hidden.
                </p>
              ) : (
                <div className="space-y-2">
                  {counsellors.map((counsellor, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-2">
                      <Input
                        placeholder="Counsellor Name"
                        value={counsellor.name}
                        onChange={(e) => handleCounsellorChange(idx, "name", e.target.value)}
                        className="text-xs sm:flex-1"
                      />
                      <Input
                        placeholder="Email (e.g. counsellor@example.edu)"
                        value={counsellor.email}
                        onChange={(e) => handleCounsellorChange(idx, "email", e.target.value)}
                        className="text-xs sm:flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCounsellor(idx)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                        aria-label="Remove counsellor"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Phone Line */}
            <div className="space-y-3 pt-2 border-t border-border">
              <h4 className="text-sm font-semibold text-foreground">Admin Safety Line</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="admin-phone" className="text-xs text-muted-foreground">
                    Admin Phone Number (tel: link)
                  </Label>
                  <Input
                    id="admin-phone"
                    placeholder="e.g. 9876543210"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="admin-label" className="text-xs text-muted-foreground">
                    Admin Line Description / Label
                  </Label>
                  <Input
                    id="admin-label"
                    placeholder="Friendly Learning admin, for app or safety issues"
                    value={adminLabel}
                    onChange={(e) => setAdminLabel(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={handleSaveWellbeingSettings}
                isLoading={savingWellbeing}
                disabled={isWellbeingLoading}
                className="text-xs"
              >
                {!savingWellbeing && <Save className="h-3.5 w-3.5 mr-1.5" />}
                Save Well-being Settings
              </Button>
            </div>
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
          title="Admins"
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
          title="Add an admin"
          description="Find a user by email and grant admin access."
        >
          <UserSearchForm onUserAdded={refetchAdminUsers} />
        </AdminCard>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
