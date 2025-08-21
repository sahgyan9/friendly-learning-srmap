
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EmailSettings {
  email_notifications: boolean;
  email_frequency: 'immediate' | 'daily' | 'weekly' | 'never';
}

export const EmailNotificationSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<EmailSettings>({
    email_notifications: true,
    email_frequency: 'immediate'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('email_notifications, email_frequency')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          email_notifications: data.email_notifications ?? true,
          email_frequency: data.email_frequency ?? 'immediate'
        });
      }
    } catch (error) {
      console.error('Error fetching email settings:', error);
      toast.error('Failed to load email settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<EmailSettings>) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update(newSettings)
        .eq('id', user?.id);

      if (error) throw error;

      setSettings(prev => ({ ...prev, ...newSettings }));
      toast.success('Email notification settings updated');
    } catch (error) {
      console.error('Error updating email settings:', error);
      toast.error('Failed to update email settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
        <CardDescription>
          Configure when you want to receive email notifications for messages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-notifications" className="text-base">
              Enable Email Notifications
            </Label>
            <div className="text-sm text-muted-foreground">
              Receive emails when you get new messages
            </div>
          </div>
          <Switch
            id="email-notifications"
            checked={settings.email_notifications}
            onCheckedChange={(checked) => 
              updateSettings({ email_notifications: checked })
            }
            disabled={isSaving}
          />
        </div>

        {settings.email_notifications && (
          <div className="space-y-2">
            <Label htmlFor="email-frequency" className="text-base">
              Email Frequency
            </Label>
            <Select
              value={settings.email_frequency}
              onValueChange={(value: EmailSettings['email_frequency']) => 
                updateSettings({ email_frequency: value })
              }
              disabled={isSaving}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate - Get notified right away</SelectItem>
                <SelectItem value="daily">Daily - Once per day summary</SelectItem>
                <SelectItem value="weekly">Weekly - Weekly summary</SelectItem>
                <SelectItem value="never">Never - No email notifications</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              Choose how often you want to receive email notifications
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
