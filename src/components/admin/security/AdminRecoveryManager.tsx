
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Key, Copy, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import {
  createAdminRecoveryCode, 
  getMyRecoveryCodes, 
  promoteUserToAdmin,
  AdminRecoveryCode 
} from "@/integrations/supabase/services/admin-recovery";
import { getUserByEmail } from "@/integrations/supabase/services/admin";

const AdminRecoveryManager = () => {
  const [recoveryCodes, setRecoveryCodes] = useState<AdminRecoveryCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [targetEmail, setTargetEmail] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");

  useEffect(() => {
    loadRecoveryCodes();
  }, []);

  const loadRecoveryCodes = async () => {
    try {
      const { data } = await getMyRecoveryCodes();
      setRecoveryCodes(data || []);
    } catch (error) {
      console.error("Error loading recovery codes:", error);
      toast.error("Failed to load recovery codes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecoveryCode = async () => {
    setCreating(true);
    try {
      const { data } = await createAdminRecoveryCode();
      if (data) {
        toast.success("Recovery code created successfully");
        await loadRecoveryCodes();
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to create recovery code"));
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Recovery code copied to clipboard");
  };

  const handlePromoteUser = async () => {
    if (!targetEmail || !recoveryCode) {
      toast.error("Please provide both email and recovery code");
      return;
    }

    setPromoting(true);
    try {
      // First find the user by email
      const users = await getUserByEmail(targetEmail);
      if (!users || users.length === 0) {
        toast.error("User not found with that email");
        return;
      }

      const targetUser = users[0];
      if (targetUser.is_admin) {
        toast.error("User is already an admin");
        return;
      }

      // Promote the user
      const { data: success } = await promoteUserToAdmin(recoveryCode, targetUser.id);
      
      if (success) {
        toast.success(`Successfully promoted ${targetUser.name} to admin`);
        setTargetEmail("");
        setRecoveryCode("");
        await loadRecoveryCodes();
      } else {
        toast.error("Invalid or expired recovery code");
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to promote user"));
    } finally {
      setPromoting(false);
    }
  };

  const getStatusBadge = (code: AdminRecoveryCode) => {
    const now = new Date();
    const expiresAt = new Date(code.expires_at);
    
    if (code.used_at) {
      return <Badge variant="secondary">Used</Badge>;
    } else if (now > expiresAt) {
      return <Badge variant="destructive">Expired</Badge>;
    } else {
      return <Badge variant="default">Active</Badge>;
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading recovery codes...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Admin Recovery Code Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium">Security Notice</p>
                <p>Recovery codes allow you to promote other users to admin status. Keep them secure and only share with trusted individuals.</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleCreateRecoveryCode} 
            disabled={creating}
            className="w-full"
          >
            {creating ? "Creating..." : "Generate New Recovery Code"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Promote User to Admin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target-email">User Email</Label>
              <Input
                id="target-email"
                type="email"
                placeholder="user@example.com"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="recovery-code">Recovery Code</Label>
              <Input
                id="recovery-code"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
              />
            </div>
          </div>
          <Button 
            onClick={handlePromoteUser}
            disabled={promoting || !targetEmail || !recoveryCode}
            className="w-full"
          >
            {promoting ? "Promoting..." : "Promote to Admin"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recovery Codes History</CardTitle>
        </CardHeader>
        <CardContent>
          {recoveryCodes.length === 0 ? (
            <p className="text-muted-foreground">No recovery codes created yet.</p>
          ) : (
            <div className="space-y-3">
              {recoveryCodes.map((code) => (
                <div key={code.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="font-mono text-sm">{code.recovery_code}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyCode(code.recovery_code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(code.created_at).toLocaleDateString()}
                      {code.used_at && (
                        <span> • Used: {new Date(code.used_at).toLocaleDateString()}</span>
                      )}
                      {!code.used_at && (
                        <span> • Expires: {new Date(code.expires_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(code)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRecoveryManager;
